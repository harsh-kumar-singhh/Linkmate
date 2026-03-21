import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format } from "date-fns";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30000; // 30s

export async function maintainAutopilotPipeline(specificUserId?: string) {
    const now = new Date();

    if (specificUserId) {
        const lastRun = ACTIVE_RUNS.get(specificUserId);
        if (lastRun && (now.getTime() - lastRun) < RUN_THROTTLE_MS) {
            console.log(`[Autopilot-Maintenance] SKIP (throttled) ${specificUserId}`);
            return;
        }
        ACTIVE_RUNS.set(specificUserId, now.getTime());
    }

    console.log(`[Autopilot-Maintenance] START → ${now.toISOString()}`);

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
                autopilotFrequency: true
            },
            take: specificUserId ? 1 : 10
        });

        if (!users.length) return;

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

        const getWeekKey = (d: Date) => format(d, "yyyy-'W'II");

        // ---------------- MAP POSTS ----------------
        const userPostsMap: Record<string, typeof posts> = {};

        posts.forEach(p => {
            if (!userPostsMap[p.userId]) userPostsMap[p.userId] = [];
            userPostsMap[p.userId].push(p);
        });

        // ---------------- PROCESS USERS ----------------
        for (const user of users) {
            try {
                const frequency = parseInt(user.autopilotFrequency || "0");
                if (frequency <= 0) continue;

                const userPosts = userPostsMap[user.id] || [];

                // Group by week
                const weeklyCounts: Record<string, number> = {};
                const publishedWeeks = new Set<string>();

                userPosts.forEach(p => {
                    if (!p.scheduledFor) return;

                    const wk = getWeekKey(p.scheduledFor);

                    weeklyCounts[wk] = (weeklyCounts[wk] || 0) + 1;

                    if (p.status === "PUBLISHED") {
                        publishedWeeks.add(wk);
                    }
                });

                let missing = 0;

                // ---------------- WEEK LOOP ----------------
                for (let i = 0; i < 21; i += 7) {
                    const wkDate = addDays(now, i);
                    const wk = getWeekKey(wkDate);

                    // ✅ LOCK ONLY IF PUBLISHED
                    if (publishedWeeks.has(wk)) {
                        console.log(`[Autopilot-Maintenance] LOCKED ${wk}`);
                        continue;
                    }

                    const count = weeklyCounts[wk] || 0;

                    if (count < frequency) {
                        missing = frequency - count;

                        console.log(
                            `[Autopilot-Maintenance] GAP ${wk}: ${count}/${frequency} → need ${missing}`
                        );

                        break;
                    }
                }

                // ---------------- GENERATE ----------------
                if (missing > 0) {
                    const toGenerate = Math.min(missing, 2);

                    console.log(
                        `[Autopilot-Maintenance] GENERATE ${toGenerate} for ${user.id}`
                    );

                    await generateAutopilotPosts(user.id, undefined, toGenerate);
                } else {
                    console.log(`[Autopilot-Maintenance] OK ${user.id}`);
                }

            } catch (err) {
                console.error(`[Autopilot-Maintenance] ERROR ${user.id}`, err);
            }
        }

        console.log(`[Autopilot-Maintenance] DONE`);

    } catch (err) {
        console.error(`[Autopilot-Maintenance] FATAL`, err);
    }
}

// ---------------- RECONCILE ----------------
export async function reconcileAutopilotSchedule(userId: string, newDays: string[]) {
    const now = new Date();

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

    const toDelete: string[] = [];

    for (const post of posts) {
        if (!post.scheduledFor) continue;

        const day = format(post.scheduledFor, "EEEE").toUpperCase();

        if (!normalizedDays.includes(day)) {
            toDelete.push(post.id);
        }
    }

    if (toDelete.length > 0) {
        await prisma.post.deleteMany({
            where: { id: { in: toDelete } }
        });

        console.log(`[Autopilot-Reconcile] Deleted ${toDelete.length}`);
    } else {
        console.log(`[Autopilot-Reconcile] No changes`);
    }
}