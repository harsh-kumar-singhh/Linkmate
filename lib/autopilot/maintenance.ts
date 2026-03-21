import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { toZonedTime } from "date-fns-tz";
import { addDays, format } from "date-fns";

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
            take: 10 // Process 10 users per run to minimize DB load and respect serverless limits
        });

        if (activeUsers.length === 0) {
            console.log("[Autopilot-Maintenance] No active autopilot users found.");
            return;
        }

        console.log(`[Autopilot-Maintenance] Processing ${activeUsers.length} users.`);

        // 2. Optimized Batch Count: Fetch upcoming post counts for all users in one query
        const userIds = activeUsers.map(u => u.id);
        const windowEnd = addDays(now, 21);
        
        const postCounts = await prisma.post.groupBy({
            by: ['userId'],
            where: {
                userId: { in: userIds },
                status: "SCHEDULED",
                source: "autopilot",
                scheduledFor: { 
                    gte: now,
                    lte: windowEnd 
                }
            },
            _count: { id: true }
        });

        // Map counts to user IDs for easy access
        const countMap: Record<string, number> = {};
        postCounts.forEach(c => {
            countMap[c.userId] = c._count.id;
        });

        for (const user of activeUsers) {
            try {
                const frequency = parseInt(user.autopilotFrequency || "0");
                if (frequency <= 0) {
                    console.log(`[Autopilot-Maintenance] User ${user.id}: Invalid frequency ${user.autopilotFrequency}. Skipping.`);
                    continue;
                }

                // Get count from our pre-fetched map
                const upcomingPostsCount = countMap[user.id] || 0;

                console.log(`[Autopilot-Maintenance] User ${user.id}: Scheduled=${upcomingPostsCount}, Target=${frequency}`);

                // 3. Gap Detection & Generation (Strict)
                if (upcomingPostsCount < frequency) {
                    const missing = frequency - upcomingPostsCount;
                    console.log(`[Autopilot-Maintenance] User ${user.id}: ${missing} posts missing (Target=${frequency}, Current=${upcomingPostsCount}). Triggering generation.`);
                    
                    // Generate EXACTLY what is missing up to a safety cap (3 per run)
                    const toGenerate = Math.min(missing, 3);
                    
                    await generateAutopilotPosts(user.id, undefined, toGenerate);
                } else {
                    console.log(`[Autopilot-Maintenance] User ${user.id}: Pipeline is full (${upcomingPostsCount}/${frequency} within 21 days).`);
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

/**
 * Reconciles existing scheduled posts with new autopilot settings.
 * Deletes posts that are scheduled for days no longer in the user's selection.
 */
export async function reconcileAutopilotSchedule(userId: string, newDays: string[]) {
    const now = new Date();
    console.log(`[Autopilot-Reconcile] Starting reconciliation for user ${userId}`);

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                schedule: {
                    select: { timezone: true }
                }
            }
        });

        const userTimezone = user?.schedule?.timezone || "UTC";
        const normalizedNewDays = newDays.map(d => d.toUpperCase());

        // 1. Fetch all upcoming scheduled autopilot posts
        const upcomingPosts = await prisma.post.findMany({
            where: {
                userId,
                status: "SCHEDULED",
                source: "autopilot",
                scheduledFor: {
                    gte: now
                }
            },
            select: {
                id: true,
                scheduledFor: true
            }
        });

        if (upcomingPosts.length === 0) {
            console.log(`[Autopilot-Reconcile] No upcoming posts to reconcile for user ${userId}`);
            return { deletedCount: 0 };
        }

        const postsToDelete: string[] = [];

        for (const post of upcomingPosts) {
            if (!post.scheduledFor) continue;

            // Determine the day of the week in user's timezone
            const zonedDate = toZonedTime(post.scheduledFor, userTimezone);
            const dayOfWeek = format(zonedDate, "EEEE").toUpperCase(); // e.g. "MONDAY"

            if (!normalizedNewDays.includes(dayOfWeek)) {
                console.log(`[Autopilot-Reconcile] Post ${post.id} scheduled for ${dayOfWeek} is no longer in selected days. Adding to delete list.`);
                postsToDelete.push(post.id);
            }
        }

        if (postsToDelete.length > 0) {
            const deleteResult = await prisma.post.deleteMany({
                where: {
                    id: { in: postsToDelete }
                }
            });
            console.log(`[Autopilot-Reconcile] Deleted ${deleteResult.count} invalid posts for user ${userId}`);
            return { deletedCount: deleteResult.count };
        }

        console.log(`[Autopilot-Reconcile] All ${upcomingPosts.length} posts are still valid for user ${userId}`);
        return { deletedCount: 0 };
    } catch (error) {
        console.error(`[Autopilot-Reconcile] Error reconciling schedule for user ${userId}:`, error);
        throw error;
    }
}
