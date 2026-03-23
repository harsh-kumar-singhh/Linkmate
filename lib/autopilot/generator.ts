import { prisma } from "@/lib/prisma";
import { addDays, isAfter, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getCurrentTime } from "@/lib/utils/time";
import { generatePost } from "@/lib/gemini";

const HOOK_STYLES = [
  "a thought-provoking question",
  "a short, powerful story",
  "a bold, contrarian statement",
  "a surprising statistic or fact",
  "a relatable professional struggle",
  "a direct, no-nonsense practical tip",
];

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

function calculateSimilarity(str1: string, str2: string): number {
  const clean = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "");
  const words1 = new Set(clean(str1).split(/\s+/).slice(0, 40));
  const words2 = new Set(clean(str2).split(/\s+/).slice(0, 40));
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

function findNextSlot(
  dayName: string,
  timeStr: string,
  timezone: string,
  searchFrom: Date
): Date | null {
  const targetDay = DAY_MAP[dayName.toUpperCase()];
  if (targetDay === undefined) return null;

  const fromZoned = toZonedTime(searchFrom, timezone);

  for (let i = 0; i <= 14; i++) {
    const candidate = addDays(fromZoned, i);
    if (candidate.getDay() !== targetDay) continue;

    // ✅ CORRECT TIME CREATION (no Date constructor)
    const dateStr = format(candidate, "yyyy-MM-dd");
    const slot = fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);

    // ✅ CRITICAL FIX: compare in SAME timezone context
    if (!isAfter(slot, searchFrom)) continue;

    return slot;
  }

  return null;
}

export async function generateAutopilotPosts(
  userId: string,
  specificDay: string,
  afterDate?: Date,
  testNow?: Date
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
      schedule: { select: { timezone: true } },
    },
  });

  if (!user?.autopilotEnabled) return null;

  const timezone = user.schedule?.timezone ?? "Asia/Kolkata";
  const topics = user.autopilotTopics as string[];
  const timeStr = user.autopilotTime;

  if (!topics?.length || !timeStr) return null;

  // ✅ Slight safety improvement: normalize afterDate
  const searchFrom = afterDate ? addDays(afterDate, 1) : now;

  const slot = findNextSlot(specificDay, timeStr, timezone, searchFrom);
  if (!slot) return null;

  const existing = await prisma.post.findFirst({
    where: {
      userId,
      scheduledFor: slot,
      status: { in: ["SCHEDULED", "PENDING"] },
    },
  });
  if (existing) return null;

  const context = [
    user.autopilotCurrentFocus && `FOCUS: ${user.autopilotCurrentFocus}`,
    user.autopilotAboutYou && `ABOUT: ${user.autopilotAboutYou}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const recentPosts = await prisma.post.findMany({
    where: { userId, source: "autopilot" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { content: true },
  });

  const topic = topics[Math.floor(Math.random() * topics.length)];
  const hook = HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)];

  let content = "";
  for (let attempt = 0; attempt <= 2; attempt++) {
    content = await generatePost({
      topic,
      style: "Professional",
      context: `${context}\n\nStart with ${hook}`,
    });

    const isDuplicate = recentPosts.some(
      (p) => calculateSimilarity(p.content, content) > 0.7
    );
    if (!isDuplicate) break;
  }

  const post = await prisma.post.create({
    data: {
      userId,
      content,
      status: "SCHEDULED",
      scheduledFor: slot,
      source: "autopilot",
      topic,
    },
  });

  console.log(
    `[Generator] Created post | user=${userId} | day=${specificDay} | slot=${slot.toISOString()}`
  );

  return post;
}