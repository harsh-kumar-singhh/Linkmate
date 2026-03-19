import { getPrisma } from "@/lib/prisma";
import { addDays, format, startOfDay, parse, isAfter, setHours, setMinutes } from "date-fns";

const prisma = getPrisma();

export async function generateAutopilotPosts(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
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
        },
    });

    // 1. Fetch User Config & Exit Early Conditions
    if (!user) {
        console.log(`[Autopilot] User ${userId} not found.`);
        return;
    }

    if (!user.autopilotEnabled) {
        console.log(`[Autopilot] User ${userId} has autopilot disabled. Stopping.`);
        return;
    }

    if (user.plan?.toUpperCase() !== "PRO") {
        console.log(`[Autopilot] User ${userId} not eligible (requires PRO plan).`);
        return;
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime;
    
    if (topics.length === 0 || daysEnabled.length === 0 || !timeStr) {
        console.log(`[Autopilot] User ${userId} has incomplete configuration (topics, days, or time missing).`);
        return;
    }

    console.log(`[Autopilot] Starting Rolling 7-Day Pipeline for user ${userId}`);

    // LOGGING INITIALIZATION
    let expectedSlotsCount = 0;
    let existingPostsCountTotal = 0;
    let missingSlotsCount = 0;
    let generatedPostsCount = 0;
    const createdTimes: string[] = [];

    const now = new Date();
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);
    
    // 2. Build Rolling 7-Day Window
    const validSlots: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const targetDate = addDays(now, i);
        const dayName = format(targetDate, "EEEE").toUpperCase().substring(0, 3); // Convert "Monday" to "MON"

        // Handle both "Monday" and "MON" formats for flexibility, though UI likely sends "MON"
        const formattedDayName = format(targetDate, "EEEE").toUpperCase();
        const shortDayName = formattedDayName.substring(0, 3);

        if (daysEnabled.includes(formattedDayName) || daysEnabled.includes(shortDayName)) {
            const scheduledFor = new Date(Date.UTC(
                targetDate.getUTCFullYear(),
                targetDate.getUTCMonth(),
                targetDate.getUTCDate(),
                utcHours,
                utcMinutes,
                0,
                0
            ));

            if (isAfter(scheduledFor, now)) {
                validSlots.push(scheduledFor);
            }
        }
    }
    expectedSlotsCount = validSlots.length;

    // 3. Fetch Existing Posts in the window
    const windowEnd = addDays(now, 7);
    const existingPosts = await prisma.post.findMany({
        where: {
            userId,
            source: "autopilot",
            scheduledFor: {
                gte: now,
                lte: windowEnd
            }
        }
    });
    existingPostsCountTotal = existingPosts.length;

    // 4. Detect Missing Slots
    const missingSlots: Date[] = [];
    for (const slot of validSlots) {
        const alreadyExists = existingPosts.some(post => 
            post.scheduledFor && Math.abs(post.scheduledFor.getTime() - slot.getTime()) < 60000 // Minute precision
        );

        if (!alreadyExists) {
            missingSlots.push(slot);
        }
    }
    missingSlotsCount = missingSlots.length;

    if (missingSlotsCount === 0) {
        console.log(`[Autopilot] No missing slots for user ${userId}. Pipeline is full.`);
        // FINAL LOGGING (MANDATORY)
        console.log(`[Autopilot] SUMMARY:
            - User ID: ${userId}
            - Expected Slots: ${expectedSlotsCount}
            - Existing Posts: ${existingPostsCountTotal}
            - Missing Slots: ${missingSlotsCount}
            - Posts Generated: ${generatedPostsCount}`);
        return [];
    }

    // 5. Generate Posts ONLY for Missing Slots
    const userContext = [
        user.autopilotAboutYou ? `About Me: ${user.autopilotAboutYou}` : "",
        user.autopilotCurrentFocus ? `Current Focus: ${user.autopilotCurrentFocus}` : ""
    ].filter(Boolean).join("\n\n");

    const style = user.defaultTone || "Professional";
    let userWritingSample = undefined;

    const styles = (user.writingStyles as any[]) || [];
    if (user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default") {
        const matchedStyle = styles.find(s => s.id === user.autopilotWritingStyleId);
        if (matchedStyle?.sample) {
            userWritingSample = matchedStyle.sample;
        }
    } else if (style.includes("Write Like Me") && styles.length > 0) {
        userWritingSample = styles[0].sample;
    }

    const { generatePost } = require("@/lib/gemini");
    const generatedPosts = [];

    // Count all existing autopilot posts to determine topic rotation index
    const totalExistingAutopilotPosts = await prisma.post.count({
        where: { userId, source: "autopilot" }
    });

    for (let i = 0; i < missingSlots.length; i++) {
        const slot = missingSlots[i];
        
        // Topic rotation logic: (totalExisting + currentBatchIndex) % topics.length
        const topicIndex = (totalExistingAutopilotPosts + i) % topics.length;
        const selectedTopic = topics[topicIndex];

        try {
            // DUPLICATE PROTECTION: Final check before creation
            const duplicateCheck = await prisma.post.findFirst({
                where: {
                    userId,
                    scheduledFor: {
                        gte: new Date(slot.getTime() - 30000),
                        lte: new Date(slot.getTime() + 30000)
                    }
                }
            });

            if (duplicateCheck) {
                console.log(`[Autopilot] Duplicate prevented for slot: ${slot.toISOString()}`);
                continue;
            }

            console.log(`[Autopilot] Generating for missing slot: ${slot.toISOString()} (Topic: ${selectedTopic})`);
            
            const content = await generatePost({
                topic: selectedTopic,
                style: user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default" ? "Write Like Me" : style,
                userWritingSample,
                context: userContext || undefined,
                targetLength: 800,
            });

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

            generatedPosts.push(post);
            generatedPostsCount++;
            createdTimes.push(slot.toISOString());

        } catch (error) {
            console.error(`[Autopilot] Failed to generate for slot ${slot.toISOString()}:`, error);
        }
    }

    // FINAL LOGGING (MANDATORY)
    console.log(`[Autopilot] SUMMARY:
        - User ID: ${userId}
        - Expected Slots: ${expectedSlotsCount}
        - Existing Posts: ${existingPostsCountTotal}
        - Missing Slots: ${missingSlotsCount}
        - Posts Generated: ${generatedPostsCount}
        - Created Times: ${createdTimes.join(", ")}`);

    return generatedPosts;
}

