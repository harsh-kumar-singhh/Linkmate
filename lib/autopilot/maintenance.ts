import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";

/**
 * Main logic for maintaining the rolling autopilot pipeline.
 * This should be called by the cron job after publishing posts.
 */
export async function maintainAutopilotPipeline() {
    const now = new Date();
    console.log(`[Autopilot-Maintenance] Starting pipeline maintenance at ${now.toISOString()}`);

    try {
        // 1. Fetch active users with valid autopilot config
        // Using batching to avoid overloading the database
        const activeUsers = await prisma.user.findMany({
            where: {
                autopilotEnabled: true,
                linkedinConnected: true,
                // Basic validation that settings exist
                NOT: [
                    { autopilotFrequency: null },
                    { autopilotDays: { equals: [] } },
                    { autopilotTime: null }
                ],
                // Ensure users have topics
                autopilotTopics: {
                    not: {
                        equals: []
                    }
                }
            },
            select: {
                id: true,
                autopilotFrequency: true,
                autopilotDays: true,
            },
            take: 20 // Process 20 users per run to respect serverless limits
        });

        if (activeUsers.length === 0) {
            console.log("[Autopilot-Maintenance] No active autopilot users found.");
            return;
        }

        console.log(`[Autopilot-Maintenance] Processing ${activeUsers.length} users.`);

        for (const user of activeUsers) {
            try {
                const frequency = parseInt(user.autopilotFrequency || "0");
                if (frequency <= 0) {
                    console.log(`[Autopilot-Maintenance] User ${user.id}: Invalid frequency ${user.autopilotFrequency}. Skipping.`);
                    continue;
                }

                // 2. Count current scheduled autopilot posts
                const upcomingPostsCount = await prisma.post.count({
                    where: {
                        userId: user.id,
                        status: "SCHEDULED",
                        source: "autopilot",
                        scheduledFor: {
                            gte: now
                        }
                    }
                });

                console.log(`[Autopilot-Maintenance] User ${user.id}: Scheduled=${upcomingPostsCount}, Target=${frequency}`);

                // 3. Gap Detection & Generation
                if (upcomingPostsCount < frequency) {
                    const missing = frequency - upcomingPostsCount;
                    console.log(`[Autopilot-Maintenance] User ${user.id}: ${missing} posts missing. Triggering generation.`);
                    
                    // Limit generation to 2 per run for safety (idempotency & rate limiting)
                    const toGenerate = Math.min(missing, 2);
                    
                    // We don't await this to keep the loop moving, but in serverless we MUST await it to ensure completion.
                    // Given this is a cron job, we await it.
                    await generateAutopilotPosts(user.id, undefined, toGenerate);
                } else {
                    console.log(`[Autopilot-Maintenance] User ${user.id}: Pipeline is full.`);
                }
            } catch (userError) {
                console.error(`[Autopilot-Maintenance] Error processing user ${user.id}:`, userError);
            }
        }

        console.log("[Autopilot-Maintenance] Pipeline maintenance completed.");
    } catch (error) {
        console.error("[Autopilot-Maintenance] FATAL ERROR:", error);
    }
}
