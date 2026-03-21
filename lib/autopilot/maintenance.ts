import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { toZonedTime } from "date-fns-tz";
import { addDays, format } from "date-fns";

/**
 * Main logic for maintaining the rolling autopilot pipeline.
 */
export async function maintainAutopilotPipeline() {
    const now = new Date();
    console.log(`[Autopilot-Maintenance] Starting pipeline maintenance at ${now.toISOString()}`);

    try {
        // 1. Fetch active users
        const activeUsers = await prisma.user.findMany({
            where: {
                autopilotEnabled: true,
                linkedinConnected: true,
                NOT: [
                    { autopilotFrequency: null },
                    { autopilotDays: { equals: [] } },
                    { autopilotTime: null }
                ],
                autopilotTopics: {
                    not: { equals: [] }
                }
            },
            select: {
                id: true,
                autopilotFrequency: true,
                autopilotDays: true,
            },
            take: 10
        });

        if (activeUsers.length === 0) {
            console.log("[Autopilot-Maintenance] No active autopilot users found.");
            return;
        }

        console.log(`[Autopilot-Maintenance] Processing ${activeUsers.length} users.`);

        // 2. Fetch upcoming posts (single query → low DB load)
        const userIds = activeUsers.map(u => u.id);
        const windowEnd = addDays(now, 21);

        const upcomingPosts = await prisma.post.findMany({
            where: {
                userId: { in: userIds },
                status: "SCHEDULED",
                source: "autopilot",
                scheduledFor: {
                    gte: now,
                    lte: windowEnd
                }
            },
            select: {
                userId: true,
                scheduledFor: true
            }
        });

        // 3. Map posts to users
        const userPostsMap: Record<string, Date[]> = {};
        upcomingPosts.forEach(p => {
            if (p.scheduledFor) {
                if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
                userPostsMap[p.userId].push(p.scheduledFor);
            }
        });

        const getWeekKey = (date: Date) => format(date, "yyyy-'W'II");

        // 4. Process each user
        for (const user of activeUsers) {
            try {
                const frequency = parseInt(user.autopilotFrequency || "0");
                if (frequency <= 0) continue;

                const userPosts = userPostsMap[user.id] || [];

                // Group by week
                const weeklyCounts: Record<string, number> = {};
                userPosts.forEach(p => {
                    const weekKey = getWeekKey(p);
                    weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
                });

                // 🔥 Only fix FIRST incomplete week
                let missingForEarliestWeek = 0;

                for (let i = 0; i < 21; i += 7) {
                    const weekDate = addDays(now, i);
                    const weekKey = getWeekKey(weekDate);
                    const count = weeklyCounts[weekKey] || 0;

                    if (count < frequency) {
                        missingForEarliestWeek = frequency - count;

                        console.log(
                            `[Autopilot-Maintenance] User ${user.id}: Gap in ${weekKey} (${count}/${frequency}). Need ${missingForEarliestWeek}.`
                        );

                        break; // 🚨 CRITICAL
                    }
                }

                if (missingForEarliestWeek > 0) {
                    const toGenerate = Math.min(missingForEarliestWeek, 2);

                    console.log(
                        `[Autopilot-Maintenance] User ${user.id}: Generating ${toGenerate} post(s).`
                    );

                    await generateAutopilotPosts(user.id, undefined, toGenerate);
                } else {
                    console.log(
                        `[Autopilot-Maintenance] User ${user.id}: All weeks satisfied.`
                    );
                }

            } catch (err) {
                console.error(`[Autopilot-Maintenance] Error for user ${user.id}:`, err);
            }
        }

        console.log("[Autopilot-Maintenance] Pipeline maintenance completed.");

    } catch (error) {
        console.error("[Autopilot-Maintenance] FATAL ERROR:", error);
    }
}

/**
 * Reconcile schedule when user changes selected days
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

        const timezone = user?.schedule?.timezone || "UTC";
        const normalizedDays = newDays.map(d => d.toUpperCase());

        const posts = await prisma.post.findMany({
            where: {
                userId,
                status: "SCHEDULED",
                source: "autopilot",
                scheduledFor: { gte: now }
            },
            select: {
                id: true,
                scheduledFor: true
            }
        });

        const toDelete: string[] = [];

        for (const post of posts) {
            if (!post.scheduledFor) continue;

            const zoned = toZonedTime(post.scheduledFor, timezone);
            const day = format(zoned, "EEEE").toUpperCase();

            if (!normalizedDays.includes(day)) {
                toDelete.push(post.id);
            }
        }

        if (toDelete.length > 0) {
            const result = await prisma.post.deleteMany({
                where: { id: { in: toDelete } }
            });

            console.log(`[Autopilot-Reconcile] Deleted ${result.count} posts.`);
            return { deletedCount: result.count };
        }

        console.log(`[Autopilot-Reconcile] No invalid posts.`);
        return { deletedCount: 0 };

    } catch (error) {
        console.error(`[Autopilot-Reconcile] ERROR:`, error);
        throw error;
    }
}