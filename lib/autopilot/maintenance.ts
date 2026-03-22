// maintenance.ts
import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30000; // 30s

export async function maintainAutopilotPipeline(specificUserId?: string) {
    const now = new Date();

    if (specificUserId) {
        const lastRun = ACTIVE_RUNS.get(specificUserId);
        if (lastRun && (now.getTime() - lastRun) < RUN_THROTTLE_MS) {
            console.log(`[Maintenance] ⏭️  SKIP ${specificUserId} (throttled, last run ${Math.floor((now.getTime() - lastRun) / 1000)}s ago)`);
            return;
        }
        ACTIVE_RUNS.set(specificUserId, now.getTime());
    }

    console.log(`[Maintenance] 🚀 START → ${now.toISOString()}`);

    try {
        // ---------------- USERS ----------------
        const users = await prisma.user.findMany({
            where: {
                id: specificUserId || undefined,
                autopilotEnabled: true,
                linkedinConnected: true,
                autopilotTopics: { not: { equals: [] } },
                NOT: [
                    { autopilotFrequency: null },
                    { autopilotDays: { equals: [] } },
                    { autopilotTime: null }
                ]
            },
            select: {
                id: true,
                autopilotFrequency: true,
                autopilotDays: true,
                autopilotTime: true,
                schedule: { select: { timezone: true } }
            },
            take: specificUserId ? 1 : 10
        });

        if (!users.length) {
            console.log(`[Maintenance] No eligible users found`);
            return;
        }

        console.log(`[Maintenance] Processing ${users.length} user(s)`);

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
                status: true,
                scheduledFor: true
            }
        });

        console.log(`[Maintenance] Found ${posts.length} existing posts across all users`);

        const getWeekKey = (d: Date) => format(d, "yyyy-'W'II");

        // ---------------- MAP POSTS BY USER ----------------
        const userPostsMap: Record<string, typeof posts> = {};

        posts.forEach(p => {
            if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
            userPostsMap[p.userId].push(p);
        });

        // ---------------- PROCESS EACH USER ----------------
        for (const user of users) {
            try {
                const frequency = parseInt(user.autopilotFrequency || "0");
                if (frequency <= 0) {
                    console.log(`[Maintenance] ⚠️  User ${user.id}: Invalid frequency`);
                    continue;
                }

                const timezone = user.schedule?.timezone || "UTC";
                const userPosts = userPostsMap[user.id] || [];
                const selectedDays = (user.autopilotDays as string[]).map(d => d.toUpperCase());

                console.log(`[Maintenance] 👤 User ${user.id}: ${userPosts.length} posts, frequency ${frequency}/week, timezone ${timezone}, days: ${selectedDays.join(', ')}`);

                // ✅ NEW: Track posts by DAY
                const postsByDay: Record<string, { scheduled: number; published: number }> = {};
                
                selectedDays.forEach(day => {
                    postsByDay[day] = { scheduled: 0, published: 0 };
                });

                userPosts.forEach(p => {
                    if (!p.scheduledFor) return;

                    const zoned = toZonedTime(p.scheduledFor, timezone);
                    const dayName = format(zoned, "EEEE").toUpperCase();

                    if (!selectedDays.includes(dayName)) return;

                    if (p.status === "PUBLISHED") {
                        postsByDay[dayName].published++;
                    } else {
                        postsByDay[dayName].scheduled++;
                    }
                });

                console.log(`[Maintenance] Posts by day:`, postsByDay);

                // ✅ NEW: Generate for each day that needs a post
                for (const day of selectedDays) {
                    const { scheduled, published } = postsByDay[day];
                    const total = scheduled + published;

                    // ✅ CRITICAL: Each day should have exactly 1 scheduled post at all times
                    // If it's published, generate next occurrence
                    // If it's scheduled, do nothing
                    
                    if (scheduled === 0) {
                        // No scheduled post for this day → generate one
                        console.log(`[Maintenance] 🎯 ${day}: No scheduled post, generating replacement`);
                        
                        await generateAutopilotPosts(user.id, undefined, 1, day);
                    } else {
                        console.log(`[Maintenance] ✅ ${day}: Already has scheduled post`);
                    }
                }

            } catch (err) {
                console.error(`[Maintenance] ❌ ERROR processing user ${user.id}:`, err);
            }
        }

        console.log(`[Maintenance] ✅ COMPLETE`);

    } catch (err) {
        console.error(`[Maintenance] ❌ FATAL ERROR:`, err);
    }
}

// ---------------- RECONCILE ----------------
export async function reconcileAutopilotSchedule(userId: string, newDays: string[]) {
    const now = new Date();

    console.log(`[Reconcile] 🔄 User ${userId}: Reconciling schedule with new days: ${newDays.join(', ')}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            schedule: { select: { timezone: true } }
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

    console.log(`[Reconcile] Found ${posts.length} scheduled posts`);

    const toDelete: string[] = [];

    for (const post of posts) {
        if (!post.scheduledFor) continue;

        const zoned = toZonedTime(post.scheduledFor, timezone);
        const day = format(zoned, "EEEE").toUpperCase();

        if (!normalizedDays.includes(day)) {
            console.log(`[Reconcile] ❌ Marking post ${post.id} for deletion (${day} not in new schedule)`);
            toDelete.push(post.id);
        } else {
            console.log(`[Reconcile] ✅ Keeping post ${post.id} (${day} matches new schedule)`);
        }
    }

    if (toDelete.length > 0) {
        await prisma.post.deleteMany({
            where: { id: { in: toDelete } }
        });

        console.log(`[Reconcile] 🗑️  Deleted ${toDelete.length} post(s)`);
    } else {
        console.log(`[Reconcile] ✅ No changes needed`);
    }
}