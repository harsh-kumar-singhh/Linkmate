import { prisma } from "@/lib/prisma";
import { addDays, format, isAfter } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils/time";
import { generatePost } from "@/lib/gemini";

const HOOK_STYLES = [
    "a thought-provoking question",
    "a short, powerful story",
    "a bold, contrarian statement",
    "a surprising statistic or fact",
    "a relatable professional struggle",
    "a direct, no-nonsense practical tip"
];

// ---------------- SIMILARITY ----------------
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '');
    const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '');

    const words1 = new Set(s1.split(/\s+/).slice(0, 40));
    const words2 = new Set(s2.split(/\s+/).slice(0, 40));

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union === 0 ? 0 : intersection / union;
}

// ---------------- MAIN FUNCTION ----------------
export async function generateAutopilotPosts(
    userId: string,
    testNow?: Date,
    maxToGenerate: number = 2
) {
    const now = getCurrentTime(testNow);
    console.log(`[Autopilot] START → ${now.toISOString()}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            autopilotEnabled: true,
            autopilotTopics: true,
            autopilotDays: true,
            autopilotTime: true,
            autopilotFrequency: true,
            autopilotAboutYou: true,
            autopilotCurrentFocus: true,
            schedule: { select: { timezone: true } }
        }
    });

    if (!user || !user.autopilotEnabled) return [];

    const timezone = user.schedule?.timezone || "UTC";

    const topics = user.autopilotTopics as string[];
    const days = user.autopilotDays as string[];
    const timeStr = user.autopilotTime;

    if (!topics?.length || !days?.length || !timeStr) return [];

    const frequency = parseInt(user.autopilotFrequency || "0");
    if (frequency <= 0) return [];

    const dayMap: Record<string, number> = {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6
    };

    const enabledDays = days
        .map(d => dayMap[d.toUpperCase()])
        .filter((d): d is number => d !== undefined);

    const getWeekKey = (date: Date) => format(date, "yyyy-'W'II");

    // ---------------- BUILD SLOTS ----------------
    const slotsByWeek = new Map<string, Date[]>();

    for (let i = 0; i < 21; i++) {
        const base = addDays(now, i);
        const zoned = toZonedTime(base, timezone);
        const dow = zoned.getDay();

        if (!enabledDays.includes(dow)) continue;

        const dateStr = format(zoned, "yyyy-MM-dd");
        const slot = fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);

        const isToday =
            format(toZonedTime(now, timezone), "yyyy-MM-dd") === dateStr;

        // ✅ Allow TODAY even if time passed
        if (!isToday && !isAfter(slot, now)) continue;

        const wk = getWeekKey(slot);

        if (!slotsByWeek.has(wk)) slotsByWeek.set(wk, []);
        slotsByWeek.get(wk)!.push(slot);
    }

    // ---------------- EXISTING POSTS ----------------
    const windowEnd = addDays(now, 21);

    const existingPosts = await prisma.post.findMany({
        where: {
            userId,
            status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] },
            scheduledFor: { lte: windowEnd }
        },
        select: {
            status: true,
            scheduledFor: true
        }
    });

    const postsByWeek = new Map<string, Set<number>>();

    existingPosts.forEach(p => {
        if (!p.scheduledFor) return;
        const wk = getWeekKey(p.scheduledFor);

        if (!postsByWeek.has(wk)) postsByWeek.set(wk, new Set());
        postsByWeek.get(wk)!.add(p.scheduledFor.getTime());
    });

    // ---------------- SLOT SELECTION ----------------
    const selectedSlots: Date[] = [];
    const weekKeys = Array.from(slotsByWeek.keys()).sort();

    for (const wk of weekKeys) {
        if (selectedSlots.length >= maxToGenerate) break;

        const slots = (slotsByWeek.get(wk) || []).sort(
            (a, b) => a.getTime() - b.getTime()
        );

        const occupied = postsByWeek.get(wk) || new Set();

        // ✅ ONLY LOCK BASED ON PUBLISHED POSTS
        const isLocked = existingPosts.some(
            p =>
                p.status === "PUBLISHED" &&
                p.scheduledFor &&
                getWeekKey(p.scheduledFor) === wk
        );

        if (isLocked) {
            console.log(`[Autopilot] LOCKED week ${wk} (published exists)`);
            continue;
        }

        let allowed = frequency - occupied.size;

        if (allowed <= 0) {
            console.log(`[Autopilot] WEEK FULL ${wk}`);
            continue;
        }

        console.log(`[Autopilot] WEEK ${wk}: ${occupied.size}/${frequency}`);

        for (const slot of slots) {
            if (selectedSlots.length >= maxToGenerate) break;
            if (allowed <= 0) break;

            if (!occupied.has(slot.getTime())) {
                console.log(`[Autopilot] SELECT: ${slot.toISOString()}`);
                selectedSlots.push(slot);
                allowed--;
            }
        }

        // ONLY FIRST INCOMPLETE WEEK
        if (selectedSlots.length > 0) break;
    }

    if (selectedSlots.length === 0) return [];

    // ---------------- CONTEXT ----------------
    const context = [
        user.autopilotCurrentFocus && `FOCUS: ${user.autopilotCurrentFocus}`,
        user.autopilotAboutYou && `ABOUT: ${user.autopilotAboutYou}`
    ].filter(Boolean).join("\n\n");

    const recentPosts = await prisma.post.findMany({
        where: { userId, source: "autopilot" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true }
    });

    const last = await prisma.post.findFirst({
        where: { userId, source: "autopilot" },
        orderBy: { createdAt: "desc" },
        select: { topic: true }
    });

    let topicIndex = 0;
    if (last?.topic) {
        const idx = topics.indexOf(last.topic);
        if (idx !== -1) topicIndex = (idx + 1) % topics.length;
    }

    // ---------------- GENERATION ----------------
    const results = [];

    for (let i = 0; i < selectedSlots.length; i++) {
        const slot = selectedSlots[i];
        const topic = topics[(topicIndex + i) % topics.length];
        const hook = HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)];

        let content = "";
        let tries = 0;

        while (tries <= 2) {
            content = await generatePost({
                topic,
                style: "Professional",
                context: `${context}\n\nStart with ${hook}`
            });

            const duplicate = recentPosts.some(p =>
                calculateSimilarity(p.content, content) > 0.7
            );

            if (!duplicate) break;
            tries++;
        }

        const exists = await prisma.post.findFirst({
            where: {
                userId,
                scheduledFor: slot,
                status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] }
            }
        });

        if (exists) continue;

        const post = await prisma.post.create({
            data: {
                userId,
                content,
                status: "SCHEDULED",
                scheduledFor: slot,
                source: "autopilot",
                topic
            }
        });

        results.push(post);
    }

    console.log(`[Autopilot] CREATED → ${results.length}`);
    return results;
}