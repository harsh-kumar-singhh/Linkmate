import { getPrisma } from "@/lib/prisma";
import { addDays, format, startOfDay, isAfter } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils/time";
import { generatePost } from "@/lib/gemini";

const prisma = getPrisma();

export async function generateAutopilotPosts(userId: string, testNow?: Date) {
    // 0. Simulation & Timezone Setup
    const simulatedNow = getCurrentTime(testNow);
    console.log(`[Autopilot] [START] Generation started for user ${userId} at ${simulatedNow.toISOString()}`);
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            autopilotEnabled: true,
            autopilotTopics: true,
            autopilotDays: true,
            autopilotTime: true,
            autopilotFrequency: true,
            autopilotAboutYou: true,
            autopilotCurrentFocus: true,
            autopilotWritingStyleId: true,
            plan: true,
            defaultTone: true,
            writingStyles: true,
            schedule: {
                select: { timezone: true }
            }
        },
    });

    // 1. Log All Configuration (Part 2)
    console.log(`[Autopilot] Config check:
        - user: ${user?.email || "NOT FOUND"}
        - enabled: ${user?.autopilotEnabled}
        - plan: ${user?.plan}
        - topics: ${JSON.stringify(user?.autopilotTopics)}
        - days: ${JSON.stringify(user?.autopilotDays)}
        - time: ${user?.autopilotTime}
        - frequency: ${user?.autopilotFrequency}`);

    const userTimezone = user?.schedule?.timezone || "UTC";

    if (!user) {
        console.error(`[Autopilot] [EXIT] User ${userId} not found.`);
        return [];
    }

    if (!user.autopilotEnabled) {
        console.log(`[Autopilot] [EXIT] Autopilot disabled for user ${userId}.`);
        return [];
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime;
    
    if (topics.length === 0) {
        console.error(`[Autopilot] [EXIT] No topics selected.`);
        return [];
    }
    if (daysEnabled.length === 0) {
        console.error(`[Autopilot] [EXIT] No days enabled.`);
        return [];
    }
    if (!timeStr) {
        console.error(`[Autopilot] [EXIT] No time set.`);
        return [];
    }

    // 2. Build Rolling 7-Day Window
    const validSlots: Date[] = [];
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);
    const userNow = toZonedTime(simulatedNow, userTimezone);
    
    for (let i = 0; i < 7; i++) {
        const targetDay = addDays(userNow, i);
        const dayName = format(targetDay, "EEEE").toUpperCase();
        const shortDayName = dayName.substring(0, 3);

        if (daysEnabled.includes(dayName) || daysEnabled.includes(shortDayName)) {
            const scheduledForUtc = new Date(Date.UTC(
                targetDay.getUTCFullYear(),
                targetDay.getUTCMonth(),
                targetDay.getUTCDate(),
                utcHours,
                utcMinutes,
                0,
                0
            ));

            if (isAfter(scheduledForUtc, simulatedNow)) {
                validSlots.push(scheduledForUtc);
            }
        }
    }

    console.log(`[Autopilot] validSlotsFound: ${validSlots.length}`);

    // If no future slots are found in next 7 days, force one today/tomorrow
    if (validSlots.length === 0) {
        console.log(`[Autopilot] [FORCE] No future slots found in 7-day window. Forcing a fallback slot.`);
        const fallbackSlot = addDays(simulatedNow, 1);
        fallbackSlot.setUTCHours(utcHours, utcMinutes, 0, 0);
        validSlots.push(fallbackSlot);
    }

    // 3. Fetch Existing Posts
    const windowEnd = addDays(simulatedNow, 7);
    const existingPosts = await prisma.post.findMany({
        where: {
            userId,
            source: "autopilot",
            scheduledFor: {
                gte: simulatedNow,
                lte: windowEnd
            }
        }
    });

    // 4. Detect Missing Slots
    const missingSlots: Date[] = [];
    for (const slot of validSlots) {
        const slotDayStr = format(toZonedTime(slot, userTimezone), "yyyy-MM-dd");
        const alreadyExistsOnDay = existingPosts.some(post => {
            if (!post.scheduledFor) return false;
            const postDayStr = format(toZonedTime(post.scheduledFor, userTimezone), "yyyy-MM-dd");
            return postDayStr === slotDayStr;
        });

        if (!alreadyExistsOnDay) {
            missingSlots.push(slot);
        }
    }

    console.log(`[Autopilot] missingSlots identified: ${missingSlots.length}`);

    // Part 3: Force generation if missingSlots is 0 but NO posts exist
    if (missingSlots.length === 0 && existingPosts.length === 0) {
        console.log(`[Autopilot] [FORCE BUILD] 0 slots missing but 0 posts exist. Creating absolute first post.`);
        missingSlots.push(validSlots[0]);
    }

    if (missingSlots.length === 0) {
        console.log(`[Autopilot] [EXIT] Pipeline full. No new posts needed.`);
        return [];
    }

    // 5. Generate and Save Posts
    const userContext = [
        user.autopilotAboutYou ? `About Me: ${user.autopilotAboutYou}` : "",
        user.autopilotCurrentFocus ? `Current Focus: ${user.autopilotCurrentFocus}` : ""
    ].filter(Boolean).join("\n\n");

    const baseStyle = user.defaultTone || "Professional";
    let userWritingSample = undefined;

    const styles = (user.writingStyles as any[]) || [];
    if (user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default") {
        const matchedStyle = styles.find(s => s.id === user.autopilotWritingStyleId);
        if (matchedStyle?.sample) {
            userWritingSample = matchedStyle.sample;
        }
    }

    const generatedPostsList = [];
    const totalExistingCount = await prisma.post.count({
        where: { userId, source: "autopilot" }
    });

    for (let i = 0; i < missingSlots.length; i++) {
        const slot = missingSlots[i];
        const topicIndex = (totalExistingCount + i) % topics.length;
        const selectedTopic = topics[topicIndex];

        console.log(`[Autopilot] [LOOP] Generating slot ${i+1}/${missingSlots.length}: Topic=${selectedTopic}, Slot=${slot.toISOString()}`);

        let content = null;
        try {
            // Part 4: ALWAYS call AI
            console.log(`[Autopilot] [AI CALL] Requesting content...`);
            content = await generatePost({
                topic: selectedTopic,
                style: user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default" ? "Write Like Me" : baseStyle,
                userWritingSample,
                context: userContext || undefined,
                targetLength: 1000,
            });
            
            if (!content || content.trim().length === 0) {
                throw new Error("AI returned empty content");
            }
        } catch (error) {
            console.error(`[Autopilot] [AI FAILURE]`, error);
            // Part 6: Fallback Safety
            console.log(`[Autopilot] [FALLBACK] Using static fallback for topic: ${selectedTopic}`);
            content = `Focusing on ${selectedTopic} today. It's essential for anyone looking to make a real impact in their field.\n\n#${selectedTopic.replace(/\s+/g, '')} #Insights #Professional`;
        }

        // Part 5: ALWAYS Create Post
        try {
            console.log(`[Autopilot] [DB WRITE] Creating post...`);
            const post = await prisma.post.create({
                data: {
                    userId,
                    content,
                    status: "SCHEDULED",
                    scheduledFor: slot,
                    source: "autopilot",
                    topic: selectedTopic,
                    userModified: false
                },
            });
            console.log(`[Autopilot] [SUCCESS] Created post ${post.id}`);
            generatedPostsList.push(post);
        } catch (dbError) {
            console.error(`[Autopilot] [DB ERROR] FATAL during prisma.create:`, dbError);
        }
    }

    // Part 7: Final Assertion
    if (generatedPostsList.length === 0 && missingSlots.length > 0) {
        console.error(`[Autopilot] [CRITICAL] Generated 0 posts despite ${missingSlots.length} missing slots!`);
        throw new Error('CRITICAL: Autopilot generator ran but created no posts in database.');
    }

    console.log(`[Autopilot] [END] Pipeline finished. Generated ${generatedPostsList.length} posts.`);
    return generatedPostsList;
}

