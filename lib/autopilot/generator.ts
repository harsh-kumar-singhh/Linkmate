import { prisma } from "@/lib/prisma";
import { addDays, format, startOfDay, isAfter } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils/time";
import { generatePost } from "@/lib/gemini";

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

    const userTimezone = user?.schedule?.timezone || "UTC";

    // 1. Log All Configuration
    console.log(`[Autopilot] Config check:
        - user: ${user?.email || "NOT FOUND"}
        - enabled: ${user?.autopilotEnabled}
        - plan: ${user?.plan}
        - topics: ${JSON.stringify(user?.autopilotTopics)}
        - days: ${JSON.stringify(user?.autopilotDays)}
        - time: ${user?.autopilotTime}
        - writingStyleId: ${user?.autopilotWritingStyleId}
        - frequency: ${user?.autopilotFrequency}`);

    if (!user) {
        console.error(`[Autopilot] [EXIT] User ${userId} not found.`);
        return [];
    }

    if (!user.autopilotEnabled) {
        console.log(`[Autopilot] [EXIT] Autopilot disabled for user ${userId}.`);
        return [];
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabledStr = (user.autopilotDays as string[]) || []; // e.g. ["MONDAY", "WEDNESDAY"]
    const timeStr = user.autopilotTime;
    
    if (topics.length === 0 || daysEnabledStr.length === 0 || !timeStr) {
        console.error(`[Autopilot] [EXIT] Incomplete configuration.`);
        return [];
    }

    // MAP DAYS TO NUMERIC INDEXES (0-6)
    const dayMap: Record<string, number> = {
        "SUNDAY": 0, "SUN": 0,
        "MONDAY": 1, "MON": 1,
        "TUESDAY": 2, "TUE": 2,
        "WEDNESDAY": 3, "WED": 3,
        "THURSDAY": 4, "THU": 4,
        "FRIDAY": 5, "FRI": 5,
        "SATURDAY": 6, "SAT": 6
    };
    const dayIndexes = daysEnabledStr.map(d => dayMap[d.toUpperCase()]).filter(idx => idx !== undefined);

    // 2. Build Rolling 7-Day Window (Part 1 - Accuracy)
    const validSlots: Date[] = [];
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);
    const userNow = toZonedTime(simulatedNow, userTimezone);
    
    for (let i = 0; i < 7; i++) {
        // Calculate the target day in user's timezone
        const targetDay = addDays(userNow, i);
        const dayOfWeek = targetDay.getDay(); // 0-6

        if (dayIndexes.includes(dayOfWeek)) {
            // Create the slot time as a UTC date for the specific day
            // We use the UTC time stored in settings, and the day derived from the user's timezone today.
            const scheduledForUtc = new Date(Date.UTC(
                targetDay.getFullYear(),
                targetDay.getMonth(),
                targetDay.getDate(),
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

    console.log(`[Autopilot] validSlots identified: ${validSlots.length}`);

    // If no slots found even with strict indexes, log warning but do NOT force random days
    if (validSlots.length === 0) {
        console.warn(`[Autopilot] [WAIT] No future slots found in 7-day window for selected days.`);
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

    // 4. Detect Missing Slots (Part 2 - Ensure ALL valid slots are filled)
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

    // Part 3 Force: If absolutely no posts exist, ensure we do something (but still respect days if possible)
    if (missingSlots.length === 0 && existingPosts.length === 0 && validSlots.length > 0) {
        console.log(`[Autopilot] [FORCE] 0 missing slots but 0 posts exist. Creating absolute first post.`);
        missingSlots.push(validSlots[0]);
    }

    if (missingSlots.length === 0) {
        console.log(`[Autopilot] [EXIT] All slots filled.`);
        return [];
    }

    // 5. Generate and Save Posts
    const userContext = [
        user.autopilotAboutYou ? `About Me: ${user.autopilotAboutYou}` : "",
        user.autopilotCurrentFocus ? `Current Focus: ${user.autopilotCurrentFocus}` : ""
    ].filter(Boolean).join("\n\n");

    const baseStyle = user.defaultTone || "Professional";
    let userWritingSample = undefined;

    // WRITING STYLE PERSISTENCE & PARSE
    let styleToUse = baseStyle;
    // Fetch and prepare all styles (including legacy ones for parity)
    let styles = (user.writingStyles as any[]) || [];
    if (styles.length === 0) {
        if ((user as any).writingStyle) styles.push({ name: "Legacy (Main)", sample: (user as any).writingStyle });
        // Use customStyles from user if it exists and is not empty
        const customStyles = (user as any).customStyles || [];
        customStyles.forEach((s: string, i: number) => {
            if (s) styles.push({ name: `Legacy (Extra ${i + 1})`, sample: s });
        });
    }

    if (user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default") {
        const matchedStyle = styles.find(s => s.id === user.autopilotWritingStyleId || s.name === user.autopilotWritingStyleId);
        if (matchedStyle) {
            styleToUse = `Write Like Me — ${matchedStyle.name}`;
            userWritingSample = matchedStyle.sample || matchedStyle.content;
            console.log(`[Autopilot] Using Specific Writing Style: ${matchedStyle.name}`);
        }
    } else if (styles.length > 0) {
        // "default" or "automatic" mode -> Use the first available style
        const defaultStyle = styles[0];
        styleToUse = `Write Like Me — ${defaultStyle.name}`;
        userWritingSample = defaultStyle.sample || defaultStyle.content;
        console.log(`[Autopilot] Using Automatic (Default) Writing Style: ${defaultStyle.name}`);
    } else {
        console.log(`[Autopilot] No writing styles found. Using base tone: ${baseStyle}`);
    }

    const generatedPostsList = [];
    const totalExistingCount = await prisma.post.count({
        where: { userId, source: "autopilot" }
    });

    for (let i = 0; i < missingSlots.length; i++) {
        const slot = missingSlots[i];
        const topicIndex = (totalExistingCount + i) % topics.length;
        const selectedTopic = topics[topicIndex];

        console.log(`[Autopilot] [LOOP] Generating slot ${i+1}/${missingSlots.length}: Topic=${selectedTopic}, Slot=${slot.toISOString()}, Style=${styleToUse}`);

        let content = null;
        try {
            content = await generatePost({
                topic: selectedTopic,
                style: styleToUse,
                userWritingSample,
                context: userContext || undefined,
                targetLength: 1000,
            });
            
            if (!content || content.trim().length === 0) {
                throw new Error("Empty content returned");
            }
        } catch (error) {
            console.error(`[Autopilot] AI Failure:`, error);
            content = `Focusing on ${selectedTopic} today. It's essential for anyone looking to make a real impact in their field.\n\n#${selectedTopic.replace(/\s+/g, '')} #Insights #Professional`;
        }

        try {
            const post = await prisma.post.create({
                data: {
                    userId,
                    content,
                    status: "SCHEDULED",
                    scheduledFor: slot,
                    source: "autopilot",
                    topic: selectedTopic,
                    userModified: false,
                    writingStyle: styleToUse // Part 4 integrity
                },
            });
            console.log(`[Autopilot] [SUCCESS] Created post ${post.id}`);
            generatedPostsList.push(post);
        } catch (dbError) {
            console.error(`[Autopilot] [DB ERROR]`, dbError);
        }
    }

    // Part 7 Assert
    if (generatedPostsList.length === 0 && missingSlots.length > 0) {
        throw new Error('CRITICAL: Autopilot failed to create any posts.');
    }

    console.log(`[Autopilot] [END] Created ${generatedPostsList.length} posts.`);
    return generatedPostsList;
}

