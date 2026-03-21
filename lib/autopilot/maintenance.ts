import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format, isAfter, startOfISOWeek } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30000; // 30 seconds

/**
 * Main logic for maintaining the rolling autopilot pipeline.
 * Can be called globally (cron) or for a specific user (on save/trigger).
 */
export async function maintainAutopilotPipeline(specificUserId?: string) {
    const now = new Date();
    
    if (specificUserId) {
        const lastRun = ACTIVE_RUNS.get(specificUserId);
        if (lastRun && (now.getTime() - lastRun) < RUN_THROTTLE_MS) {
            console.log(`[Autopilot-Maintenance] Skipping run for user ${specificUserId} - Throttled (last run < 30s ago)`);
            return;
        }
        ACTIVE_RUNS.set(specificUserId, now.getTime());
    }

    console.log(`[Autopilot-Maintenance] Starting pipeline maintenance at ${now.toISOString()} ${specificUserId ? `for user ${specificUserId}` : '(Full Batch)'}`);

    try {
        // 1. Fetch active users
        const activeUsers = await prisma.user.findMany({
            where: {
                id: specificUserId || undefined,
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
                autopilotTime: true,
                schedule: {
                    select: { timezone: true }
                }
            },
            take: specificUserId ? 1 : 10
        });

        if (activeUsers.length === 0) {
            console.log("[Autopilot-Maintenance] No active autopilot users found.");
            return;
        }

        console.log(`[Autopilot-Maintenance] Processing ${activeUsers.length} users.`);

        // 🔥 FIXED WINDOW
        const userIds = activeUsers.map(u => u.id);
        const windowEnd = addDays(now, 21);

        // 🔥 FIXED QUERY (NO gte: now)
        const allPosts = await prisma.post.findMany({
            where: {
                userId: { in: userIds },
                source: "autopilot",
                status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] },
                scheduledFor: {
                    lte: windowEnd
                }
            },
            select: {
                userId: true,
                scheduledFor: true
            }
        });

        // 3. Map posts to users
        const userPostsMap: Record<string, any[]> = {};
        allPosts.forEach(p => {
            if (p.scheduledFor) {
                if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
                userPostsMap[p.userId].push(p);
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
                    const weekKey = getWeekKey(p.scheduledFor);
                    weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
                });

                let missingForEarliestWeek = 0;

                // 🔥 Check weeks sequentially
                const currentWeekKey = getWeekKey(now);

                for (let i = 0; i < 21; i += 7) {
                    const weekDate = addDays(now, i);
                    const weekKey = getWeekKey(weekDate);
                    const count = weeklyCounts[weekKey] || 0;

                    // 🚨 PRINCIPAL ALIGNMENT: Lock current week if started or published
                    let isWeekLocked = false;

                    // Condition 1: Case-specific published check
                    const publishedInWeek = (userPosts as any[]).some(p => 
                        p.status === "PUBLISHED" && format(p.scheduledFor, "yyyy-'W'II") === weekKey
                    );
                    if (publishedInWeek) {
                        console.log(`[Autopilot-Maintenance] User ${user.id}: LOCK Week ${weekKey} (has published posts).`);
                        isWeekLocked = true;
                    }

                    // Condition 2: Started check
                    if (weekKey === currentWeekKey && !isWeekLocked) {
                        const days = user.autopilotDays as string[];
                        const timeStr = user.autopilotTime;
                        const timezone = (user.schedule as any)?.timezone || "UTC";

                        if (days?.length && timeStr) {
                            const dayMap: Record<string, number> = {
                                SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
                            };
                            
                            const isoEnabledDays = days
                                .map(d => dayMap[d.toUpperCase()])
                                .filter((d): d is number => d !== undefined)
                                .sort((a, b) => {
                                    const valA = a === 0 ? 7 : a;
                                    const valB = b === 0 ? 7 : b;
                                    return valA - valB;
                                });
                            
                            if (isoEnabledDays.length > 0) {
                                const firstDay = isoEnabledDays[0];
                                const weekStart = startOfISOWeek(now);
                                const daysToAdd = firstDay === 0 ? 6 : firstDay - 1;
                                
                                const firstDayDate = addDays(weekStart, daysToAdd);
                                const firstDayZoned = toZonedTime(firstDayDate, timezone);
                                const firstDayStr = format(firstDayZoned, "yyyy-MM-dd");
                                const firstSlotDate = fromZonedTime(`${firstDayStr}T${timeStr}:00`, timezone);

                                if (!isAfter(firstSlotDate, now)) {
                                    console.log(`[Autopilot-Maintenance] User ${user.id}: LOCK Week ${weekKey} (started at ${firstSlotDate.toISOString()}).`);
                                    isWeekLocked = true;
                                }
                            }
                        }
                    }

                    if (isWeekLocked) continue;

                    if (count < frequency) {
                        missingForEarliestWeek = frequency - count;

                        console.log(
                            `[Autopilot-Maintenance] User ${user.id}: Gap in ${weekKey} (${count}/${frequency}). Need ${missingForEarliestWeek}.`
                        );

                        break;
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