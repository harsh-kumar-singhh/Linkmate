import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30000;

// ---------------- MAIN PIPELINE ----------------
export async function maintainAutopilotPipeline(userId?: string) {
    const now = new Date();

    // Throttling (prevents duplicate runs)
    if (userId) {
        const lastRun = ACTIVE_RUNS.get(userId);
        if (lastRun && now.getTime() - lastRun < RUN_THROTTLE_MS) {
            console.log(`[Maintenance] ⏭️ Skipped (throttled) for ${userId}`);
            return;
        }
        ACTIVE_RUNS.set(userId, now.getTime());
    }

    console.log(`[Maintenance] 🚀 START → ${now.toISOString()}`);

    try {
        // ---------------- FETCH USERS ----------------
        const users = await prisma.user.findMany({
            where: {
                id: userId || undefined,
                autopilotEnabled: true,
                autopilotTopics: { not: { equals: [] } },
                NOT: [
                    { autopilotDays: { equals: [] } },
                    { autopilotTime: null }
                ]
            },
            select: {
                id: true,
                autopilotDays: true,
                schedule: { select: { timezone: true } }
            },
            take: userId ? 1 : 10
        });

        if (!users.length) {
            console.log(`[Maintenance] No eligible users`);
            return;
        }

        const userIds = users.map(u => u.id);
        const windowEnd = addDays(now, 21);

        // ---------------- FETCH POSTS ----------------
        const posts = await prisma.post.findMany({
            where: {
                userId: { in: userIds },
                source: "autopilot",
                status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] },
                scheduledFor: { lte: windowEnd }
            },
            select: {
                userId: true,
                scheduledFor: true
            }
        });

        // ---------------- MAP POSTS ----------------
        const userPostsMap: Record<string, typeof posts> = {};

        posts.forEach(p => {
            if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
            userPostsMap[p.userId].push(p);
        });

        // ---------------- PROCESS USERS ----------------
        for (const user of users) {
            try {
                const timezone = user.schedule?.timezone || "Asia/Kolkata";
                const userPosts = userPostsMap[user.id] || [];

                const selectedDays = (user.autopilotDays as string[])
                    .map(d => d.toUpperCase());

                console.log(
                    `[Maintenance] 👤 User ${user.id} | timezone=${timezone} | days=${selectedDays.join(",")}`
                );

                // ---------------- FIND EXISTING DAYS ----------------
                const scheduledDays = new Set<string>();

                userPosts.forEach(p => {
                    if (!p.scheduledFor) return;

                    const zoned = toZonedTime(p.scheduledFor, timezone);
                    const dayName = format(zoned, "EEEE").toUpperCase();

                    if (selectedDays.includes(dayName)) {
                        scheduledDays.add(dayName);
                        console.log(`  ✅ Already has post on ${dayName}`);
                    }
                });

                // ---------------- GENERATE MISSING DAYS ----------------
                for (const day of selectedDays) {
                    if (!scheduledDays.has(day)) {
                        console.log(`  🎯 Generating for ${day}`);

                        await generateAutopilotPosts(
                            user.id,
                            undefined,
                            day
                        );
                    }
                }

            } catch (err) {
                console.error(`[Maintenance] ❌ Error for user ${user.id}`, err);
            }
        }

        console.log(`[Maintenance] ✅ COMPLETE`);

    } catch (err) {
        console.error(`[Maintenance] ❌ FATAL`, err);
    }
}

// ---------------- RECONCILE ----------------
export async function reconcileAutopilotSchedule(
    userId: string,
    newDays: string[]
) {
    const now = new Date();

    console.log(
        `[Reconcile] 🔄 User ${userId} | newDays=${newDays.join(",")}`
    );

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                schedule: { select: { timezone: true } }
            }
        });

        const timezone = user?.schedule?.timezone || "Asia/Kolkata";
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
                console.log(
                    `[Reconcile] ❌ Removing ${post.id} (day=${day})`
                );
                toDelete.push(post.id);
            }
        }

        if (toDelete.length > 0) {
            await prisma.post.deleteMany({
                where: { id: { in: toDelete } }
            });

            console.log(`[Reconcile] 🗑️ Deleted ${toDelete.length} posts`);
        } else {
            console.log(`[Reconcile] ✅ No changes needed`);
        }

    } catch (err) {
        console.error(`[Reconcile] ❌ Error`, err);
    }
}