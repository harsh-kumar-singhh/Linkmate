import { getPrisma } from "@/lib/prisma";
import { addDays, format, startOfDay, parse, isAfter, setHours, setMinutes } from "date-fns";

const prisma = getPrisma();

export async function generateAutopilotPosts(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            autopilotEnabled: true,
            autopilotTopics: true,
            autopilotDays: true,
            autopilotTime: true,
            autopilotAboutYou: true,
            autopilotCurrentFocus: true,
            autopilotWritingStyleId: true,
            plan: true,
            defaultTone: true,
            writingStyles: true,
        },
    });

    if (!user || !user.autopilotEnabled || user.plan?.toUpperCase() !== "PRO") {
        console.log(`[Autopilot] User ${userId} not eligible for autopilot generation. User state: Enabled=${user?.autopilotEnabled}, Plan=${user?.plan}`);
        return;
    }

    console.log(`[Autopilot] Starting generation pipeline for user ${userId}`);
    console.log(`[Autopilot] Configuration: Topics=${user.autopilotTopics}, Days=${user.autopilotDays}, Time=${user.autopilotTime}`);

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime || "09:00"; // Default to 9 AM
    
    // Context compilation
    const userContext = [
        user.autopilotAboutYou ? `About Me: ${user.autopilotAboutYou}` : "",
        user.autopilotCurrentFocus ? `Current Focus: ${user.autopilotCurrentFocus}` : ""
    ].filter(Boolean).join("\n\n");

    // Preparation for "Write Like Me" or Tone
    const style = user.defaultTone || "Professional";
    let userWritingSample = undefined;

    if (user.autopilotWritingStyleId === "default" || style.includes("Write Like Me")) {
        // If they explicitly enabled the toggle, or their default tone happens to be "Write Like Me"
        const styles = (user.writingStyles as any[]) || [];
        
        // Use the first sample if they toggled it explicitly, else try to match tone name
        if (styles.length > 0) {
            if (user.autopilotWritingStyleId === "default") {
                userWritingSample = styles[0].sample;
            } else {
                const parts = style.split(/[\u2014\u2013-]/);
                const styleName = parts.length > 1 ? parts[parts.length - 1].trim().toLowerCase() : "";
                const matchedStyle = styles.find(s => s.name?.trim().toLowerCase() === styleName);
                if (matchedStyle?.sample) {
                    userWritingSample = matchedStyle.sample;
                }
            }
        }
    }

    if (topics.length === 0 || daysEnabled.length === 0) {
        console.log(`[Autopilot] User ${userId} has incomplete configuration.`);
        return;
    }

    // Generate for the next 7 days
    const now = new Date();
    const generatedPosts = [];
    let detectedSlots = 0;

    for (let i = 0; i < 7; i++) {
        const targetDate = addDays(now, i);
        const dayName = format(targetDate, "EEEE"); // e.g., "Monday"

        if (daysEnabled.includes(dayName)) {
            // Calculate scheduled time
            const [hours, minutes] = timeStr.split(":").map(Number);
            let scheduledFor = setMinutes(setHours(startOfDay(targetDate), hours), minutes);

            // If it's today and the time has already passed, skip
            if (i === 0 && !isAfter(scheduledFor, now)) {
                continue;
            }

            // Check if post already exists for this exact time slot to prevent duplicates
            // We use exact timestamp matching or very narrow window because autopilot always schedules at the exact HH:mm
            const existingPost = await prisma.post.findFirst({
                where: {
                    userId,
                    scheduledFor: {
                        gte: scheduledFor,
                        lte: new Date(scheduledFor.getTime() + 60000), // Within same minute
                    },
                    source: "autopilot",
                },
            });

            if (!existingPost) {
                detectedSlots++;
                // Select a topic (random rotation)
                const topic = topics[Math.floor(Math.random() * topics.length)];

                try {
                    console.log(`[Autopilot] AI generation starting for slot: ${dayName} ${scheduledFor.toISOString()}...`);
                    const startTime = Date.now();
                    const { generatePost } = require("@/lib/gemini");
                    const content = await generatePost({
                        topic,
                        style: user.autopilotWritingStyleId ? "Write Like Me" : style, // Force Write Like Me if toggle enabled
                        userWritingSample,
                        context: userContext || undefined,
                        targetLength: 800, // Autopilot prefers slightly shorter, focused posts
                    });
                    console.log(`[Autopilot] AI generation completed in ${Date.now() - startTime}ms.`);

                    const post = await prisma.post.create({
                        data: {
                            userId,
                            content,
                            status: "SCHEDULED",
                            scheduledFor,
                            source: "autopilot",
                        },
                    });

                    generatedPosts.push(post);
                    console.log(`[Autopilot] Saved post to DB: ID=${post.id}, Status=${post.status}, ScheduledFor=${post.scheduledFor?.toISOString()}`);
                } catch (error) {
                    console.error(`[Autopilot] Failed to generate post for user ${userId} on ${dayName}:`, error);
                }
            } else {
                console.log(`[Autopilot] Slot already filled for ${dayName} (${scheduledFor.toISOString()})`);
            }
        }
    }

    console.log(`[Autopilot] Slot detection complete. Total valid slots found for next 7 days: ${detectedSlots}`);
    if (detectedSlots === 0) {
        console.log(`[Autopilot] 0 slots detected. Check if daysEnabled (${daysEnabled.join(", ")}) matches the upcoming 7 days, or if time has already passed for today.`);
    }

    return generatedPosts;
}
