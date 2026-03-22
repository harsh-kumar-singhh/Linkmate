// maintenance.ts - FINAL CORRECTED VERSION
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
            console.log(`[Maintenance] Throttled for ${specificUserId}`);
            return;
        }
        ACTIVE_RUNS.set(specificUserId, now.getTime());
    }

    console.log(`[Maintenance] START`);

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
                autopilotDays: true,
                schedule: { select: { timezone: true } }
            },
            take: specificUserId ? 1 : 10
        });

        if (!users.length) {
            console.log(`[Maintenance] No users found`);
            return;
        }

        const userIds = users.map(u => u.id);
        const windowEnd = addDays(now, 21);

        const posts = await prisma.post.findMany({
            where: {
                userId: { in: userIds },
                source: "autopilot",
                status: { in: ["SCHEDULED", "PENDING"] },
                scheduledFor: { gte: now, lte: windowEnd }
            },
            select: {
                userId: true,
                scheduledFor: true
            }
        });

        const userPostsMap: Record<string, typeof posts> = {};
        posts.forEach(p => {
            if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
            userPostsMap[p.userId].push(p);
        });

        for (const user of users) {
            try {
                const timezone = user.schedule?.timezone || "Asia/Kolkata";
                const userPosts = userPostsMap[user.id] || [];
                const selectedDays = (user.autopilotDays as string[]).map(d => d.toUpperCase());

                console.log(`\n[Maintenance] User ${user.id}: timezone=${timezone}, days=${selectedDays.join(',')}`);

                // Count scheduled posts per day
                const scheduledDays = new Set<string>();

                userPosts.forEach(p => {
                    if (!p.scheduledFor) return;
                    const zoned = toZonedTime(p.scheduledFor, timezone);
                    const dayName = format(zoned, "EEEE").toUpperCase();
                    
                    if (selectedDays.includes(dayName)) {
                        scheduledDays.add(dayName);
                        console.log(`  ✅ ${dayName} has scheduled post`);
                    }
                });

                // Generate for days that don't have scheduled posts
                for (const day of selectedDays) {
                    if (!scheduledDays.has(day)) {
                        console.log(`  🎯 ${day} needs post - generating...`);
                        await generateAutopilotPosts(user.id, undefined, day);
                    }
                }

            } catch (err) {
                console.error(`[Maintenance] Error for user ${user.id}:`, err);
            }
        }

        console.log(`[Maintenance] COMPLETE\n`);

    } catch (err) {
        console.error(`[Maintenance] Fatal error:`, err);
    }
}

export async function reconcileAutopilotSchedule(userId: string, newDays: string[]) {
    const now = new Date();

    console.log(`[Reconcile] User ${userId}: new days=${newDays.join(',')}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { schedule: { select: { timezone: true } } }
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
            console.log(`[Reconcile] Delete post on ${day} (not in new schedule)`);
            toDelete.push(post.id);
        }
    }

    if (toDelete.length > 0) {
        await prisma.post.deleteMany({ where: { id: { in: toDelete } } });
        console.log(`[Reconcile] Deleted ${toDelete.length} posts`);
    }
}