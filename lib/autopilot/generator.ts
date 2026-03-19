import { getPrisma } from "@/lib/prisma";
import { addDays, format, startOfDay, isAfter } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils/time";

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

    // 1. Fetch User Config & Exit Early Conditions
    if (!user) {
        console.log(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} not found.`);
        return;
    }

    if (!user.autopilotEnabled) {
        console.log(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} has autopilot disabled. Stopping.`);
        return;
    }

    if (user.plan?.toUpperCase() !== "PRO") {
        console.log(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} not eligible (requires PRO plan).`);
        return;
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime;
    
    if (topics.length === 0 || daysEnabled.length === 0 || !timeStr) {
        console.log(`[Autopilot] [${simulatedNow.toISOString()}] User ${userId} has incomplete configuration (topics, days, or time missing).`);
        return;
    }

    console.log(`[Autopilot] [${simulatedNow.toISOString()}] Starting Rolling 7-Day Pipeline for user ${user.email} (${userId})`);
    console.log(`[Autopilot] Timezone: ${userTimezone} | Simulated Now: ${simulatedNow.toISOString()}`);

    // LOGGING INITIALIZATION
    let expectedSlotsCount = 0;
    let existingPostsCountTotal = 0;
    let postsKeptCount = 0;
    let postsRemovedCount = 0;
    let missingSlotsCount = 0;
    let generatedPostsCount = 0;
    const createdTimes: string[] = [];

    // 2. Build Rolling 7-Day Window (Timezone Normalized)
    const validSlots: Date[] = [];
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);
    
    // Get "Now" in User's Timezone
    const userNow = toZonedTime(simulatedNow, userTimezone);
    
    for (let i = 0; i < 7; i++) {
        // Calculate the target day in user's timezone
        const targetDay = addDays(userNow, i);
        const dayName = format(targetDay, "EEEE").toUpperCase(); // "MONDAY"
        const shortDayName = dayName.substring(0, 3); // "MON"

        if (daysEnabled.includes(dayName) || daysEnabled.includes(shortDayName)) {
            // Create the slot time in user's timezone today
            // Note: user.autopilotTime is stored as UTC in settings flow, but Requirement 1 says "Normalize to user's timezone".
            // Wait, the UI currently converts local time -> UTC before saving.
            // If user.autopilotTime is "14:00" UTC, we should use that.
            
            // However, Requirement 1 says "Normalize all slot calculations to user's timezone and start-of-day logic".
            // This suggests we should calculate the slot as "Time X on Day Y" in User's timezone.
            
            // Let's assume user.autopilotTime is the time THEY meant in THEIR timezone, 
            // OR if it's already UTC, we just need to ensure the "Day" is correct for them.
            
            // If the UI sends UTC, then "14:00 UTC" might be "09:00 AM" for them.
            // Let's stick to the UTC time for the actual slot, but use the user's "Day" to decide if it's applicable.
            
            const scheduledForUtc = new Date(Date.UTC(
                targetDay.getUTCFullYear(),
                targetDay.getUTCMonth(),
                targetDay.getUTCDate(),
                utcHours,
                utcMinutes,
                0,
                0
            ));

            // Ensure today's slot is not skipped incorrectly
            if (isAfter(scheduledForUtc, simulatedNow)) {
                validSlots.push(scheduledForUtc);
            }
        }
    }
    expectedSlotsCount = validSlots.length;

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
    existingPostsCountTotal = existingPosts.length;

    // --- SMART RECONCILIATION LOGIC ---
    
    // Log old days (derived from existing posts) vs new days
    const oldDays = Array.from(new Set(existingPosts.map(p => {
        if (!p.scheduledFor) return null;
        const postZoned = toZonedTime(p.scheduledFor, userTimezone);
        return format(postZoned, "EEE").toUpperCase();
    }))).filter(Boolean) as string[];
    
    console.log(`[Autopilot] Reconciliation: Old Days (approx): ${oldDays.join(", ")} | New Days: ${daysEnabled.join(", ")}`);

    const postsToRemove = [];
    const validExistingPosts = [];

    for (const post of existingPosts) {
        if (!post.scheduledFor) continue;

        const postZoned = toZonedTime(post.scheduledFor, userTimezone);
        const postDayName = format(postZoned, "EEEE").toUpperCase();
        const postShortDayName = postDayName.substring(0, 3);

        const isDayStillValid = daysEnabled.includes(postDayName) || daysEnabled.includes(postShortDayName);

        // KEEP if day is still valid OR if user modified it
        if (isDayStillValid || post.userModified) {
            validExistingPosts.push(post);
        } else {
            postsToRemove.push(post);
        }
    }

    postsKeptCount = validExistingPosts.length;
    postsRemovedCount = postsToRemove.length;

    // Delete invalid posts (not matching new schedule AND not user modified)
    if (postsToRemove.length > 0) {
        console.log(`[Autopilot] Removing ${postsRemovedCount} invalid posts:`, postsToRemove.map(p => p.scheduledFor?.toISOString()));
        await prisma.post.deleteMany({
            where: {
                id: { in: postsToRemove.map(p => p.id) }
            }
        });
    }

    console.log(`[Autopilot] Kept ${postsKeptCount} valid posts.`);

    // 4. Detect Missing Slots
    const missingSlots: Date[] = [];
    for (const slot of validSlots) {
        // Match by Day to avoid double-posting if time changed on the same day
        const slotDayStr = format(toZonedTime(slot, userTimezone), "yyyy-MM-dd");
        
        const alreadyExistsOnDay = validExistingPosts.some(post => {
            if (!post.scheduledFor) return false;
            const postDayStr = format(toZonedTime(post.scheduledFor, userTimezone), "yyyy-MM-dd");
            return postDayStr === slotDayStr;
        });

        if (!alreadyExistsOnDay) {
            missingSlots.push(slot);
        } else {
            console.log(`[Autopilot] Slot for ${slotDayStr} already filled.`);
        }
    }
    missingSlotsCount = missingSlots.length;

    if (missingSlotsCount === 0) {
        console.log(`[Autopilot] [${simulatedNow.toISOString()}] No missing slots for user ${userId}. Pipeline is full.`);
        // FINAL LOGGING (MANDATORY)
        console.log(`[Autopilot] SUMMARY:
            - User ID: ${userId}
            - Expected Slots: ${expectedSlotsCount}
            - Existing Posts: ${existingPostsCountTotal}
            - Missing Slots: ${missingSlotsCount}
            - Posts Generated: ${generatedPostsCount}`);
        return [];
    }

    // 5. Generate Posts
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

        // PART 1 FIX: AI FAILURE HANDLING (Retry once)
        let content = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts && !content) {
            try {
                attempts++;
                console.log(`[Autopilot] Generating for slot: ${slot.toISOString()} (Topic: ${selectedTopic}) - Attempt ${attempts}`);
                
                content = await generatePost({
                    topic: selectedTopic,
                    style: user.autopilotWritingStyleId && user.autopilotWritingStyleId !== "default" ? "Write Like Me" : style,
                    userWritingSample,
                    context: userContext || undefined,
                    targetLength: 800,
                });
            } catch (error) {
                console.error(`[Autopilot] Attempt ${attempts} failed for slot ${slot.toISOString()}:`, error);
                if (attempts >= maxAttempts) {
                    console.log(`[Autopilot] Skipping slot ${slot.toISOString()} after ${maxAttempts} failed attempts.`);
                }
            }
        }

        if (!content) continue; // Skip if all attempts failed

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
            console.log(`[Autopilot] Successfully created post for slot: ${slot.toISOString()}`);

        } catch (error) {
            console.error(`[Autopilot] Database error for slot ${slot.toISOString()}:`, error);
        }
    }

    // FINAL LOGGING (MANDATORY)
    console.log(`[Autopilot] SUMMARY:
        - User ID: ${userId}
        - Email: ${user.email}
        - Simulated Now: ${simulatedNow.toISOString()}
        - User Timezone: ${userTimezone}
        - Old Days (approx): ${oldDays.join(", ")}
        - New Days: ${daysEnabled.join(", ")}
        - Expected Slots: ${expectedSlotsCount}
        - Total Existing (start): ${existingPostsCountTotal}
        - Posts Kept: ${postsKeptCount}
        - Posts Removed: ${postsRemovedCount}
        - Missing Slots: ${missingSlotsCount}
        - Posts Generated: ${generatedPostsCount}
        - Created Times: ${createdTimes.join(", ")}`);

    return generatedPosts;
}

