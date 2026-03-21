import { prisma } from "@/lib/prisma";
import { addDays, format, isAfter, startOfISOWeek } from "date-fns";
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
            schedule: {
                select: { timezone: true }
            }
        }
    });

    if (!user || !user.autopilotEnabled) return [];

    const timezone = (user.schedule as any)?.timezone || "UTC";

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

    const loggedNow = toZonedTime(now, timezone);
    console.log(`[Autopilot] START → ${loggedNow.toISOString()} (${timezone})`);

    const getWeekKey = (date: Date) => format(date, "yyyy-'W'II");

    // ---------------- BUILD SLOTS ----------------
    const slotsByWeek = new Map<string, Date[]>();

    for (let i = 0; i < 21; i++) {
        const d = addDays(now, i);
        const zonedD = toZonedTime(d, timezone);
        const dow = zonedD.getDay();

        if (!enabledDays.includes(dow)) continue;

        // Create slot at the specified hours/minutes in user's timezone
        // PRINCIPAL RULE: 
        // 1. Past days -> reject
        // 2. Today -> allow if not already published
        // 3. Future -> allow
        
        const slotDateStr = format(zonedD, "yyyy-MM-dd");
        const slotLocalStr = `${slotDateStr}T${timeStr}:00`;
        const slot = fromZonedTime(slotLocalStr, timezone);

        const nowDateOnly = format(toZonedTime(now, timezone), "yyyy-MM-dd");
        const isToday = slotDateStr === nowDateOnly;

        if (!isToday && !isAfter(slot, now)) continue; // Past day rejection

        const weekKey = getWeekKey(slot);

        if (!slotsByWeek.has(weekKey)) slotsByWeek.set(weekKey, []);
        slotsByWeek.get(weekKey)!.push(slot);
    }

    // ---------------- EXISTING POSTS ----------------
    // We need to count posts from the START of the current week to verify frequency accurately
    const startOfCurrentWeek = new Date(now);
    const dayOfWeek = startOfCurrentWeek.getDay(); // 0 (Sun) to 6 (Sat)
    // ISO week starts on Monday (1). Adjust accordingly if needed, but getWeekKey uses ISO week.
    // For simplicity, let's just go back 7 days to cover the current ISO week fully.
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - 7);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const windowEnd = addDays(now, 21);

    const existingPosts = await prisma.post.findMany({
        where: {
            userId,
            status: { in: ["SCHEDULED", "PUBLISHED", "PENDING"] },
            scheduledFor: { gte: startOfCurrentWeek, lte: windowEnd }
        },
        select: { status: true, scheduledFor: true }
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

    const currentWeekKey = getWeekKey(now);

    for (const wk of weekKeys) {
        if (selectedSlots.length >= maxToGenerate) break;

        const slots = (slotsByWeek.get(wk) || []).sort(
            (a, b) => a.getTime() - b.getTime()
        );

        // ---------------- WEEK LOCK AUDIT ----------------
        // 🚨 PRINCIPAL RULE: A week is LOCKED if:
        // 1. Any slot for this week has already been PUBLISHED.
        // 2. We've passed the first possible slot of the week (deterministic lock).
        
        let isWeekLocked = false;

        // Condition 1: Check published status
        const publishedInWeek = existingPosts.some(p => 
            p.status === "PUBLISHED" && getWeekKey(p.scheduledFor!) === wk
        );
        
        if (publishedInWeek) {
            console.log(`[Autopilot] LOCK: Week ${wk} has published posts. Skipping remainder.`);
            isWeekLocked = true;
        }

        // Condition 2: Check current week "started" status
        if (wk === currentWeekKey && !isWeekLocked) {
            const weekStart = startOfISOWeek(now);
            const isoEnabledDays = [...enabledDays].sort((a, b) => {
                const valA = a === 0 ? 7 : a;
                const valB = b === 0 ? 7 : b;
                return valA - valB;
            });

            if (isoEnabledDays.length > 0) {
                const firstDay = isoEnabledDays[0];
                const daysToAdd = firstDay === 0 ? 6 : firstDay - 1;
                
                const firstDayDate = addDays(weekStart, daysToAdd);
                const firstDayZoned = toZonedTime(firstDayDate, timezone);
                const firstDayStr = format(firstDayZoned, "yyyy-MM-dd");
                const firstSlotDate = fromZonedTime(`${firstDayStr}T${timeStr}:00`, timezone);

                // If now is strictly after the FIRST POSSIBLE slot of the week, the week is "started".
                // Exception: If NOTHING was published yet and we are still "Today", we allow catch-up.
                if (!isAfter(firstSlotDate, now)) {
                    // Only lock if we have NO published posts and we are NOT in the "Today catch-up" window?
                    // Actually, the user says "Once a week is locked -> NEVER generate remaining posts".
                    // And "Saturday already posted -> LOCK week -> DO NOT generate Sunday".
                    // So if Sunday is in the future, but Saturday passed/posted, we lock.
                    console.log(`[Autopilot] LOCK: Week ${wk} has started at ${firstSlotDate.toISOString()}. Skipping remainder.`);
                    isWeekLocked = true;
                }
            }
        }

        if (isWeekLocked) continue;

        const occupied = postsByWeek.get(wk) || new Set();

        let allowed = frequency - occupied.size;
        if (allowed <= 0) {
            console.log(`[Autopilot] WEEK ${wk} FULL: ${occupied.size}/${frequency}`);
            continue;
        }

        console.log(`[Autopilot] WEEK ${wk}: ${occupied.size}/${frequency} (Allowed: ${allowed})`);

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