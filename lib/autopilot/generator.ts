import { getPrisma } from "@/lib/prisma";
import { addDays, format, startOfDay, isAfter } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils/time";
import { generatePost } from "@/lib/gemini";

const prisma = getPrisma();

export async function generateAutopilotPosts(userId: string, testNow?: Date) {
    // 0. Simulation & Timezone Setup
    const simulatedNow = getCurrentTime(testNow);
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            autopilotEnabled: true,
            autopilotTopics: true,
            autopilotDays: true,
            autopilotTime: true, // This is stored as "HH:mm" in UTC (converted from Local in Wizard)
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

    const userTimezone = user?.schedule?.timezone || "UTC";

    // 1. Fetch User Config & Exit Early Conditions
    if (!user) {
        console.error(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} not found.`);
        return [];
    }

    if (!user.autopilotEnabled) {
        console.log(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} has autopilot disabled. Stopping.`);
        return [];
    }

    if (user.plan?.toUpperCase() !== "PRO") {
        console.error(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} not eligible (requires PRO plan).`);
        return [];
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime;
    
    if (topics.length === 0 || daysEnabled.length === 0 || !timeStr) {
        console.error(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} has incomplete configuration.`);
        return [];
    }

    console.log(`[Autopilot] Starting Pipeline for user ${user.email} (${userId})`);

    // 2. Build Rolling 7-Day Window
    const validSlots: Date[] = [];
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);
    
    // Get "Now" in User's Timezone for day name logic, but use UTC for the actual slot
    const userNow = toZonedTime(simulatedNow, userTimezone);
    
    for (let i = 0; i < 7; i++) {
        // Calculate the target day in user's timezone
        const targetDay = addDays(userNow, i);
        const dayName = format(targetDay, "EEEE").toUpperCase(); // "MONDAY"
        const shortDayName = dayName.substring(0, 3); // "MON"

        if (daysEnabled.includes(dayName) || daysEnabled.includes(shortDayName)) {
            // Create the slot time as a UTC date for the specific day
            // If the user's "Today" name matches, we use "Today" (targetDay)
            const scheduledForUtc = new Date(Date.UTC(
                targetDay.getUTCFullYear(),
                targetDay.getUTCMonth(),
                targetDay.getUTCDate(),
                utcHours,
                utcMinutes,
                0,
                0
            ));

            // Only add if it's in the future
            if (isAfter(scheduledForUtc, simulatedNow)) {
                validSlots.push(scheduledForUtc);
            }
        }
    }

    // 3. Fetch Existing Posts in the window
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
        // Match by Day to avoid double-posting on same day
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

    console.log(`[Autopilot] missingSlotsCount: ${missingSlots.length}`);

    // PART 5 REQUIREMENT: Ensure at least 1 post is created if no posts exist
    if (missingSlots.length === 0 && existingPosts.length === 0 && validSlots.length > 0) {
        console.log(`[Autopilot] [GUARD] No missing slots but 0 posts exist. Forcing first slot.`);
        missingSlots.push(validSlots[0]);
    }

    if (missingSlots.length === 0) {
        console.log(`[Autopilot] [SKIP] No missing slots detected.`);
        return [];
    }

    // 5. Generate Posts
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


    const generatedPosts = [];

    // Count all existing autopilot posts to determine topic rotation index
    const totalExistingAutopilotPosts = await prisma.post.count({
        where: { userId, source: "autopilot" }
    });

    for (let i = 0; i < missingSlots.length; i++) {
        const slot = missingSlots[i];
        const topicIndex = (totalExistingAutopilotPosts + i) % topics.length;
        const selectedTopic = topics[topicIndex];

        console.log(`[Autopilot] Generating post for topic: ${selectedTopic} at ${slot.toISOString()}`);

        // PART 6 FIX: AI FAILURE HANDLING (Retry + Fallback)
        let content = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts && !content) {
            try {
                attempts++;
                console.log(`[Autopilot] Calling AI (Attempt ${attempts})...`);
                
                content = await generatePost({
                    topic: selectedTopic,
                    style: user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default" ? "Write Like Me" : baseStyle,
                    userWritingSample,
                    context: userContext || undefined,
                    targetLength: 1000, // PART 6 FIX: SYNC WITH MANUAL POST LENGTH
                });
                
                if (!content || content.trim().length === 0) {
                    content = null;
                    console.warn(`[Autopilot] AI returned empty content.`);
                }
            } catch (error) {
                console.error(`[Autopilot] AI error:`, error);
                if (attempts >= maxAttempts) {
                    console.log(`[Autopilot] [FALLBACK] AI failed twice, using static template.`);
                    content = `Exploring ${selectedTopic} today. It's a critical area for professional growth and sharing insights with my network.\n\n#${selectedTopic.replace(/\s+/g, '')} #Professional #Growth`;
                }
            }
        }

        if (content) {
            try {
                // PART 7 FIX: PRISMA CREATE
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
                console.log(`[Autopilot] [SUCCESS] Post created: ${post.id}`);
                generatedPosts.push(post);
            } catch (error) {
                console.error(`[Autopilot] [DB ERROR]`, error);
            }
        }
    }

    if (generatedPosts.length === 0 && missingSlots.length > 0) {
        throw new Error('Autopilot failed: no posts were successfully created in database');
    }

    console.log(`[Autopilot] [END] Pipeline Finished. Created ${generatedPosts.length} posts.`);
    return generatedPosts;
}

