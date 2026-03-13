import { getPrisma } from "@/lib/prisma";
import { generateAutopilotPost } from "@/lib/gemini";
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
            plan: true,
        },
    });

    if (!user || !user.autopilotEnabled || user.plan?.toUpperCase() !== "PRO") {
        console.log(`[Autopilot] User ${userId} not eligible for autopilot generation.`);
        return;
    }

    const topics = (user.autopilotTopics as string[]) || [];
    const daysEnabled = (user.autopilotDays as string[]) || [];
    const timeStr = user.autopilotTime || "09:00"; // Default to 9 AM

    if (topics.length === 0 || daysEnabled.length === 0) {
        console.log(`[Autopilot] User ${userId} has incomplete configuration.`);
        return;
    }

    // Generate for the next 7 days
    const now = new Date();
    const generatedPosts = [];

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

            // Check if post already exists for this slot
            const existingPost = await prisma.post.findFirst({
                where: {
                    userId,
                    scheduledFor: {
                        gte: startOfDay(targetDate),
                        lte: addDays(startOfDay(targetDate), 1),
                    },
                    source: "autopilot",
                },
            });

            if (!existingPost) {
                // Select a topic (random rotation)
                const topic = topics[Math.floor(Math.random() * topics.length)];

                try {
                    const content = await generateAutopilotPost(topic);

                    const post = await prisma.post.create({
                        data: {
                            userId,
                            content,
                            status: "DRAFT",
                            scheduledFor,
                            source: "autopilot",
                        },
                    });

                    generatedPosts.push(post);
                    console.log(`[Autopilot] Generated post for user ${userId} on ${dayName} (${scheduledFor.toISOString()})`);
                } catch (error) {
                    console.error(`[Autopilot] Failed to generate post for user ${userId} on ${dayName}:`, error);
                }
            }
        }
    }

    return generatedPosts;
}
