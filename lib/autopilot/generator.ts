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

function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '');
    const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '');

    const words1 = new Set(s1.split(/\s+/).slice(0, 40));
    const words2 = new Set(s2.split(/\s+/).slice(0, 40));

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union === 0 ? 0 : intersection / union;
}

export async function generateAutopilotPosts(
    userId: string,
    testNow?: Date,
    specificDay?: string
) {
    const now = getCurrentTime(testNow);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            autopilotEnabled: true,
            autopilotTopics: true,
            autopilotDays: true,
            autopilotTime: true,
            autopilotAboutYou: true,
            autopilotCurrentFocus: true,
            schedule: { select: { timezone: true } }
        }
    });

    if (!user || !user.autopilotEnabled) return [];

    const timezone = user.schedule?.timezone || "Asia/Kolkata";
    const topics = user.autopilotTopics as string[];
    const timeStr = user.autopilotTime;

    if (!topics?.length || !timeStr || !specificDay) return [];

    const dayMap: Record<string, number> = {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6
    };

    const targetDay = dayMap[specificDay.toUpperCase()];
    const nowZoned = toZonedTime(now, timezone);

    let selectedSlot: Date | null = null;

    // ✅ CRITICAL FIX: Start from TODAY (i = 0)
    for (let i = 0; i <= 14; i++) {
    const candidate = addDays(nowZoned, i);

    if (candidate.getDay() !== targetDay) continue;

    const [hours, minutes] = timeStr.split(":").map(Number);

    const zonedDate = new Date(
        candidate.getFullYear(),
        candidate.getMonth(),
        candidate.getDate(),
        hours,
        minutes,
        0
    );

    const slot = fromZonedTime(zonedDate, timezone);

        // ✅ Allow TODAY even if time passed
        if (!isAfter(slot, now) && i > 0) continue;

        const exists = await prisma.post.findFirst({
            where: {
                userId,
                scheduledFor: slot,
                status: { in: ["SCHEDULED", "PENDING"] }
            }
        });

        if (!exists) {
            selectedSlot = slot;
            break;
        }
    }

    if (!selectedSlot) return [];

    // ---------------- CONTENT ----------------
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

    const topic = topics[Math.floor(Math.random() * topics.length)];
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

    const post = await prisma.post.create({
        data: {
            userId,
            content,
            status: "SCHEDULED",
            scheduledFor: selectedSlot,
            source: "autopilot",
            topic
        }
    });

    return [post];
}