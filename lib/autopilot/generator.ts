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

const WEEK_ORDER: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6
};

type PlanItem = { source: "WEEKLY_FOCUS" | "CONTEXT" | "TOPIC", value?: string, variation?: boolean, angle?: string };
const ANGLES = ["story", "lesson", "contrarian", "mistake", "insight"];

export function createContentPlan(
  weeklyFocus: string | undefined,
  additionalContexts: string[],
  topics: string[],
  slots: number
): PlanItem[] {
  const plan: PlanItem[] = [];
  
  if (weeklyFocus) {
    plan.push({ source: "WEEKLY_FOCUS", value: weeklyFocus, variation: false });
  }

  for (const ctx of additionalContexts) {
    if (plan.length >= slots) break;
    plan.push({ source: "CONTEXT", value: ctx, variation: false });
  }

  let topicIndex = 0;
  while (plan.length < slots && topicIndex < topics.length) {
    plan.push({ source: "TOPIC", value: topics[topicIndex], variation: false });
    topicIndex++;
  }

  const availableAngles = [...ANGLES].sort(() => 0.5 - Math.random());
  let angleIndex = 0;

  while (plan.length < slots) {
    if (weeklyFocus) {
      plan.push({
        source: "WEEKLY_FOCUS",
        value: weeklyFocus,
        variation: true,
        angle: availableAngles[angleIndex % availableAngles.length]
      });
      angleIndex++;
    } else if (topics.length > 0) {
      plan.push({
        source: "TOPIC",
        value: topics[topicIndex % topics.length],
        variation: true,
        angle: availableAngles[angleIndex % availableAngles.length]
      });
      angleIndex++;
      topicIndex++;
    } else {
       plan.push({ source: "TOPIC", value: "Networking & Growth", variation: false });
    }
  }

  return plan.slice(0, slots);
}

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
      aboutYou: true,
      autopilotCurrentFocus: true,
      autopilotWritingStyleId: true,
      writingStyles: true,
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

  const sortedDays = (user.autopilotDays as string[])
    .map(d => d.toUpperCase())
    .sort((a, b) => WEEK_ORDER[a] - WEEK_ORDER[b]);
  
  let slotIndex = sortedDays.indexOf(specificDay.toUpperCase());
  if (slotIndex === -1) slotIndex = 0;

  const additionalContexts = user.aboutYou ? [user.aboutYou] : [];
  
  const contentPlan = createContentPlan(
    user.autopilotCurrentFocus || undefined,
    additionalContexts,
    topics,
    sortedDays.length > 0 ? sortedDays.length : 1
  );
  
  const currentPlan = contentPlan[slotIndex];

  let promptTopic = topics[0];
  let promptContext = "";

  if (currentPlan.source === "WEEKLY_FOCUS") {
    promptTopic = "Weekly Focus / Theme";
    promptContext = `FOCUS: ${currentPlan.value}\nPlease tie the narrative deeply into this focus.`;
  } else if (currentPlan.source === "CONTEXT") {
    promptTopic = "Personal Insights";
    promptContext = `CONTEXT/BACKGROUND: ${currentPlan.value}`;
  } else if (currentPlan.source === "TOPIC") {
    promptTopic = currentPlan.value || topics[0];
    if (user.aboutYou) {
      promptContext = `ABOUT ME: ${user.aboutYou}`;
    }
  }

  if (currentPlan.variation && currentPlan.angle) {
    promptContext += `\n\nVARIATION ANGLE: Twist the perspective to focus heavily on a ${currentPlan.angle}. Approach the writing from this specific angle.`;
  }

  const recentPosts = await prisma.post.findMany({
    where: { userId, source: "autopilot" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { content: true },
  });

  const hook = HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)];

  let selectedStyle = "Professional";
  let userWritingSample: string | undefined = undefined;

  const styleId = (user as any).autopilotWritingStyleId;
  if (styleId && styleId !== "default") {
    selectedStyle = `Write Like Me - ${styleId}`;
    const styles = (user as any).writingStyles || [];
    const matchedStyle = styles.find((s: any) => s.name === styleId);
    if (matchedStyle?.sample) {
       userWritingSample = matchedStyle.sample;
    }
  }

  let content = "";
  for (let attempt = 0; attempt <= 2; attempt++) {
    content = await generatePost({
      topic: promptTopic,
      style: selectedStyle,
      userWritingSample,
      context: `${promptContext}\n\nStart with ${hook}`,
    });

    const isDuplicate = recentPosts.some(
      (p: { content: string }) => calculateSimilarity(p.content, content) > 0.7
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
      topic: promptTopic,
    },
  });

  console.log(
    `[Generator] Created post | user=${userId} | day=${specificDay} | slot=${slot.toISOString()}`
  );

  return post;
}