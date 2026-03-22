// generator.ts
import { prisma } from "@/lib/prisma";
import { addDays, format, isAfter, startOfDay } from "date-fns";
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

// ---------------- NORMALIZE SLOT KEY ----------------
function getSlotKey(date: Date, timezone: string): string {
    const zoned = toZonedTime(date, timezone);
    return format(zoned, "yyyy-MM-dd HH:mm");
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

    if (!user || !user.autopilotEnabled) {
        console.log(`[Autopilot] User not enabled or not found`);
        return [];
    }

    const timezone = user.schedule?.timezone || "UTC";

    const topics = user.autopilotTopics as string[];
    const days = user.autopilotDays as string[];
    const timeStr = user.autopilotTime;

    if (!topics?.length || !days?.length || !timeStr) {
        console.log(`[Autopilot] Missing configuration`);
        return [];
    }

    const frequency = parseInt(user.autopilotFrequency || "0");
    if (frequency <= 0) {
        console.log(`[Autopilot] Invalid frequency`);
        return [];
    }

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
    const nowZoned = toZonedTime(now, timezone);
    const todayDateStr = format(nowZoned, "yyyy-MM-dd");

    console.log(`[Autopilot] Building slots from ${todayDateStr} in ${timezone}`);

    for (let i = 0; i < 21; i++) {
        const base = addDays(now, i);
        const zoned = toZonedTime(base, timezone);
        const dow = zoned.getDay();

        if (!enabledDays.includes(dow)) continue;

        const dateStr = format(zoned, "yyyy-MM-dd");
        const slot = fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);

        const isToday = dateStr === todayDateStr;

        // ✅ Allow TODAY even if time has passed
        // ✅ For future days, only allow if slot time is after now
        if (!isToday && !isAfter(slot, now)) {
            continue;
        }

        const wk = getWeekKey(slot);

        if (!slotsByWeek.has(wk)) slotsByWeek.set(wk, []);
        slotsByWeek.get(wk)!.push(slot);

        console.log(`[Autopilot] Built slot: ${dateStr} ${timeStr} (${isToday ? 'TODAY' : 'future'}) → week ${wk}`);
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

    console.log(`[Autopilot] Found ${existingPosts.length} existing posts in window`);

    // ✅ FIXED: Normalize existing posts to slot keys for accurate comparison
    const postsByWeek = new Map<string, Set<string>>();

    existingPosts.forEach(p => {
        if (!p.scheduledFor) return;
        
        const slotKey = getSlotKey(p.scheduledFor, timezone);
        const wk = getWeekKey(p.scheduledFor);

        if (!postsByWeek.has(wk)) postsByWeek.set(wk, new Set());
        postsByWeek.get(wk)!.add(slotKey);

        console.log(`[Autopilot] Existing post: ${slotKey} (${p.status}) → week ${wk}`);
    });

    // ---------------- SLOT SELECTION ----------------
    const selectedSlots: Date[] = [];
    const weekKeys = Array.from(slotsByWeek.keys()).sort();

    console.log(`[Autopilot] Processing ${weekKeys.length} weeks: ${weekKeys.join(', ')}`);

    for (const wk of weekKeys) {
        if (selectedSlots.length >= maxToGenerate) {
            console.log(`[Autopilot] Reached max generation limit (${maxToGenerate})`);
            break;
        }

        const slots = (slotsByWeek.get(wk) || []).sort(
            (a, b) => a.getTime() - b.getTime()
        );

        const occupied = postsByWeek.get(wk) || new Set();

        // ✅ ONLY LOCK WEEK IF A PUBLISHED POST EXISTS
        const hasPublished = existingPosts.some(
            p =>
                p.status === "PUBLISHED" &&
                p.scheduledFor &&
                getWeekKey(p.scheduledFor) === wk
        );

        if (hasPublished) {
            console.log(`[Autopilot] ⛔ WEEK ${wk} LOCKED (published post exists)`);
            continue;
        }

        let allowed = frequency - occupied.size;

        if (allowed <= 0) {
            console.log(`[Autopilot] ⚠️  WEEK ${wk} FULL (${occupied.size}/${frequency})`);
            continue;
        }

        console.log(`[Autopilot] ✅ WEEK ${wk}: ${occupied.size}/${frequency} posts, ${allowed} needed`);

        // ✅ Fill ALL gaps in current week (not just first one)
        for (const slot of slots) {
            if (selectedSlots.length >= maxToGenerate) break;
            if (allowed <= 0) break;

            const slotKey = getSlotKey(slot, timezone);

            if (!occupied.has(slotKey)) {
                console.log(`[Autopilot] 🎯 SELECT: ${slotKey} (${slot.toISOString()})`);
                selectedSlots.push(slot);
                allowed--;
            } else {
                console.log(`[Autopilot] ⏭️  SKIP: ${slotKey} (already occupied)`);
            }
        }

        // ✅ ONLY process first incomplete week (don't jump to next week if current has gaps)
        if (selectedSlots.length > 0) {
            console.log(`[Autopilot] Stopping after first incomplete week`);
            break;
        }
    }

    if (selectedSlots.length === 0) {
        console.log(`[Autopilot] No slots selected`);
        return [];
    }

    console.log(`[Autopilot] Selected ${selectedSlots.length} slots for generation`);

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

        console.log(`[Autopilot] Generating post ${i + 1}/${selectedSlots.length} for ${getSlotKey(slot, timezone)} on topic: ${topic}`);

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
            
            console.log(`[Autopilot] Duplicate detected, regenerating (attempt ${tries + 1}/3)`);
            tries++;
        }

        // ✅ Double-check slot isn't occupied (race condition protection)
        const slotKey = getSlotKey(slot, timezone);
        const exists = await prisma.post.findFirst({
            where: {
                userId,
                scheduledFor: slot,
                status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] }
            }
        });

        if (exists) {
            console.log(`[Autopilot] ⚠️  Slot ${slotKey} occupied during generation, skipping`);
            continue;
        }

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

        console.log(`[Autopilot] ✅ Created post ${post.id} for ${slotKey}`);
        results.push(post);
    }

    console.log(`[Autopilot] COMPLETE → Created ${results.length} posts`);
    return results;
}