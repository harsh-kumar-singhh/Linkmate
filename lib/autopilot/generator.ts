import { prisma } from "@/lib/prisma";
import { addDays, format, isAfter } from "date-fns";
import { toZonedTime } from "date-fns-tz";
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
    const simulatedNow = getCurrentTime(testNow);
    console.log(`[Autopilot] START → ${simulatedNow.toISOString()}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            email: true,
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

    if (!user || !user.autopilotEnabled) {
        console.log(`[Autopilot] EXIT → invalid user/config`);
        return [];
    }

    const timezone = user.schedule?.timezone || "UTC";
    const topics = user.autopilotTopics as string[];
    const days = user.autopilotDays as string[];
    const timeStr = user.autopilotTime;

    if (!topics?.length || !days?.length || !timeStr) {
        console.log(`[Autopilot] EXIT → incomplete config`);
        return [];
    }

    const frequency = parseInt(user.autopilotFrequency || "0");
    if (frequency <= 0) return [];

    // ---------------- DAY MAP ----------------
    const dayMap: Record<string, number> = {
        SUNDAY: 0, MONDAY: 1, TUESDAY: 2,
        WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
    };

    // ✅ FIXED (keeps Sunday = 0)
    const enabledDays = days
        .map(d => dayMap[d.toUpperCase()])
        .filter((d): d is number => d !== undefined);

    const getWeekKey = (date: Date) => format(date, "yyyy-'W'II");

    // ---------------- BUILD SLOTS ----------------
    const userNow = toZonedTime(simulatedNow, timezone);
    const [hours, minutes] = timeStr.split(":").map(Number);

    const slotsByWeek = new Map<string, Date[]>();

    for (let i = 0; i < 21; i++) {
        const d = addDays(userNow, i);
        const dow = d.getDay();

        if (!enabledDays.includes(dow)) continue;

        const slot = new Date(Date.UTC(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            hours,
            minutes
        ));

        if (!isAfter(slot, simulatedNow)) continue;

        const weekKey = getWeekKey(slot);
        if (!slotsByWeek.has(weekKey)) slotsByWeek.set(weekKey, []);
        slotsByWeek.get(weekKey)!.push(slot);
    }

    console.log(`[Autopilot] Slots built: ${slotsByWeek.size} weeks`);

    // ---------------- EXISTING POSTS ----------------
    const windowEnd = addDays(simulatedNow, 21);

    const existing = await prisma.post.findMany({
        where: {
            userId,
            status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] },
            scheduledFor: { gte: simulatedNow, lte: windowEnd }
        },
        select: { scheduledFor: true }
    });

    const postsByWeek = new Map<string, Set<number>>();

    existing.forEach(p => {
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

        const slots = slotsByWeek.get(wk) || [];
        const occupied = postsByWeek.get(wk) || new Set();

        const current = occupied.size;
        let allowed = frequency - current;

        if (allowed <= 0) continue;

        console.log(`[Autopilot] WEEK ${wk}: ${current}/${frequency}`);

        for (const slot of slots) {
            if (selectedSlots.length >= maxToGenerate) break;
            if (allowed <= 0) break;

            if (!occupied.has(slot.getTime())) {
                selectedSlots.push(slot);
                allowed--;
            }
        }

        // 🔥 CRITICAL STOP
        if (selectedSlots.length > 0) break;
    }

    // ✅ FINAL SAFETY (never exceed limit)
    const slotsToProcess = selectedSlots.slice(0, maxToGenerate);

    if (slotsToProcess.length === 0) {
        console.log(`[Autopilot] EXIT → nothing to generate`);
        return [];
    }

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

    // ---------------- TOPIC ROTATION ----------------
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

    for (let i = 0; i < slotsToProcess.length; i++) {
        const slot = slotsToProcess[i];
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

        // idempotency
        const exists = await prisma.post.findFirst({
            where: { userId, scheduledFor: slot }
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