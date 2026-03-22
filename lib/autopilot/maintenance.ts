// maintenance.ts (DEBUG VERSION)
import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30000;

export async function maintainAutopilotPipeline(specificUserId?: string) {
    const now = new Date();

    if (specificUserId) {
        const lastRun = ACTIVE_RUNS.get(specificUserId);
        if (lastRun && (now.getTime() - lastRun) < RUN_THROTTLE_MS) {
            console.log(`[Maintenance] ⏭️  SKIP ${specificUserId} (throttled)`);
            return;
        }
        ACTIVE_RUNS.set(specificUserId, now.getTime());
    }

    console.log(`[Maintenance] 🚀 START → ${now.toISOString()}`);

    try {
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

        console.log(`[Maintenance] Found ${posts.length} existing posts`);

        const userPostsMap: Record<string, typeof posts> = {};
        posts.forEach(p => {
            if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
            userPostsMap[p.userId].push(p);
        });

        for (const user of users) {
            try {
                const frequency = parseInt(user.autopilotFrequency || "0");
                if (frequency <= 0) continue;

                const timezone = user.schedule?.timezone || "UTC";
                const userPosts = userPostsMap[user.id] || [];
                
                // ✅ CRITICAL: Get days from database and normalize
                const rawDays = user.autopilotDays as string[];
                const selectedDays = rawDays.map(d => d.toUpperCase());

                console.log(`\n[Maintenance] 👤 User ${user.id}`);
                console.log(`  Frequency: ${frequency}/week`);
                console.log(`  Timezone: ${timezone}`);
                console.log(`  Raw days from DB: ${JSON.stringify(rawDays)}`);
                console.log(`  Normalized days: ${JSON.stringify(selectedDays)}`);
                console.log(`  Existing posts: ${userPosts.length}`);

                // ✅ Track posts by day
                const postsByDay: Record<string, number> = {};
                selectedDays.forEach(day => {
                    postsByDay[day] = 0;
                });

                // ✅ Count scheduled posts per day
                userPosts.forEach(p => {
                    if (!p.scheduledFor) return;
                    if (p.status === "PUBLISHED") return; // Skip published

                    // Convert to user timezone
                    const zoned = toZonedTime(p.scheduledFor, timezone);
                    const dayName = format(zoned, "EEEE").toUpperCase();

                    console.log(`  Post: ${format(zoned, "yyyy-MM-dd EEEE HH:mm")} → ${dayName} (${p.status})`);

                    if (selectedDays.includes(dayName)) {
                        postsByDay[dayName]++;
                        console.log(`    ✅ Counted for ${dayName} (now: ${postsByDay[dayName]})`);
                    } else {
                        console.log(`    ⏭️  Skipped (${dayName} not in ${selectedDays.join(', ')})`);
                    }
                });

                console.log(`  Posts by day:`, postsByDay);

                // ✅ Generate for days with 0 scheduled posts
                for (const day of selectedDays) {
                    const count = postsByDay[day];

                    if (count === 0) {
                        console.log(`  🎯 ${day}: Needs post, generating...`);
                        await generateAutopilotPosts(user.id, undefined, 1, day);
                    } else {
                        console.log(`  ✅ ${day}: Has ${count} scheduled post(s)`);
                    }
                }

            } catch (err) {
                console.error(`[Maintenance] ❌ ERROR user ${user.id}:`, err);
            }
        }

        console.log(`\n[Maintenance] ✅ COMPLETE`);

    } catch (err) {
        console.error(`[Maintenance] ❌ FATAL:`, err);
    }
}

export async function reconcileAutopilotSchedule(userId: string, newDays: string[]) {
    const now = new Date();

    console.log(`[Reconcile] 🔄 User ${userId}: New days: ${newDays.join(', ')}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { schedule: { select: { timezone: true } } }
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

        console.log(`[Reconcile] Post: ${format(zoned, "yyyy-MM-dd EEEE")} → ${day}`);

        if (!normalizedDays.includes(day)) {
            console.log(`[Reconcile]   ❌ Delete (not in ${normalizedDays.join(', ')})`);
            toDelete.push(post.id);
        } else {
            console.log(`[Reconcile]   ✅ Keep`);
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