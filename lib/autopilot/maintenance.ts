import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30000;

export async function maintainAutopilotPipeline(userId?: string) {
    const now = new Date();

    if (userId) {
        const lastRun = ACTIVE_RUNS.get(userId);
        if (lastRun && now.getTime() - lastRun < RUN_THROTTLE_MS) return;
        ACTIVE_RUNS.set(userId, now.getTime());
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                id: userId || undefined,
                autopilotEnabled: true,
                linkedinConnected: true,
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

        if (!users.length) return;

        const userIds = users.map(u => u.id);
        const windowEnd = addDays(now, 21);

        // ✅ ONLY FUTURE POSTS
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
            const timezone = user.schedule?.timezone || "Asia/Kolkata";
            const userPosts = userPostsMap[user.id] || [];

            const selectedDays = (user.autopilotDays as string[])
                .map(d => d.toUpperCase());

            // ✅ ONLY FUTURE DAYS COUNT
            const futureDays = new Set<string>();

            userPosts.forEach(p => {
                if (!p.scheduledFor) return;

                const zoned = toZonedTime(p.scheduledFor, timezone);
                const day = format(zoned, "EEEE").toUpperCase();

                if (selectedDays.includes(day)) {
                    futureDays.add(day);
                }
            });

            // ✅ GENERATE ONLY IF NO FUTURE POST
            for (const day of selectedDays) {
                if (!futureDays.has(day)) {
                    await generateAutopilotPosts(user.id, undefined, day);
                }
            }
        }

    } catch (err) {
        console.error("[Maintenance] ERROR", err);
    }
}

// ---------------- RECONCILE ----------------
export async function reconcileAutopilotSchedule(
    userId: string,
    newDays: string[]
) {
    const now = new Date();

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
            toDelete.push(post.id);
        }
    }

    if (toDelete.length > 0) {
        await prisma.post.deleteMany({
            where: { id: { in: toDelete } }
        });
    }
}