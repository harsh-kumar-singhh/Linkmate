// generator.ts - FINAL CORRECTED VERSION
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
    console.log(`[Autopilot] START for user ${userId}${specificDay ? ` - specific day: ${specificDay}` : ''}`);

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

    if (!user || !user.autopilotEnabled) {
        console.log(`[Autopilot] User not enabled`);
        return [];
    }

    const timezone = user.schedule?.timezone || "Asia/Kolkata";
    const topics = user.autopilotTopics as string[];
    const days = user.autopilotDays as string[];
    const timeStr = user.autopilotTime;

    if (!topics?.length || !days?.length || !timeStr) {
        console.log(`[Autopilot] Missing config`);
        return [];
    }

    console.log(`[Autopilot] Config: timezone=${timezone}, days=${days.join(',')}, time=${timeStr}`);

    // Day name to number mapping
    const dayMap: Record<string, number> = {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6
    };

    // Get target day number
    let targetDayNumber: number;
    
    if (specificDay) {
        targetDayNumber = dayMap[specificDay.toUpperCase()];
        console.log(`[Autopilot] Looking for next ${specificDay} (day number ${targetDayNumber})`);
    } else {
        console.log(`[Autopilot] ERROR: specificDay is required`);
        return [];
    }

    // Find next occurrence of target day
    const nowInTimezone = toZonedTime(now, timezone);
    let daysToAdd = 0;
    let foundSlot: Date | null = null;

    for (let i = 1; i <= 14; i++) {
        const checkDate = addDays(nowInTimezone, i);
        if (checkDate.getDay() === targetDayNumber) {
            const dateStr = format(checkDate, "yyyy-MM-dd");
            const slot = fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);
            
            // Check if this slot is already occupied
            const exists = await prisma.post.findFirst({
                where: {
                    userId,
                    scheduledFor: slot,
                    status: { in: ["SCHEDULED", "PENDING"] }
                }
            });

            if (!exists) {
                foundSlot = slot;
                console.log(`[Autopilot] Found available slot: ${dateStr} ${timeStr} (${format(toZonedTime(slot, timezone), 'EEEE')})`);
                break;
            } else {
                console.log(`[Autopilot] Slot ${dateStr} ${timeStr} already occupied, checking next week`);
            }
        }
    }

    if (!foundSlot) {
        console.log(`[Autopilot] No available slot found for ${specificDay}`);
        return [];
    }

    // Get context
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

    const topic = topics[topicIndex];
    const hook = HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)];

    console.log(`[Autopilot] Generating post for ${format(toZonedTime(foundSlot, timezone), 'EEEE, MMM dd')} at ${timeStr} on topic: ${topic}`);

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
            scheduledFor: foundSlot,
            source: "autopilot",
            topic
        }
    });

    console.log(`[Autopilot] ✅ Created post ${post.id} for ${format(toZonedTime(foundSlot, timezone), 'EEEE, MMM dd yyyy HH:mm')}`);
    return [post];
}