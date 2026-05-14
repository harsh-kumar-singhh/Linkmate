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

type ContentArchetype = 
  | "WEEKLY_FOCUS"           // Uses the exact weekly focus/context directly
  | "INDUSTRY_OBSERVATION"   // Broader niche insights or trends connected to topics
  | "OPINION"                // Unique angle, lesson, or contrarian observation
  | "GENERAL_NEWS"           // Behavioral insights or market shifts
  | "TOPIC_DEEP_DIVE";       // Focus on a specific user topic

type PlanItem = { 
  source: "WEEKLY_FOCUS" | "CONTEXT" | "TOPIC", 
  value?: string, 
  variation?: boolean, 
  angle?: string,
  archetype: ContentArchetype
};

const ARCHETYPE_ROTATION: ContentArchetype[] = [
  "WEEKLY_FOCUS",
  "INDUSTRY_OBSERVATION",
  "OPINION",
  "GENERAL_NEWS",
  "TOPIC_DEEP_DIVE"
];

export function createContentPlan(
  weeklyFocus: string | undefined,
  additionalContexts: string[],
  topics: string[],
  slots: number
): PlanItem[] {
  const plan: PlanItem[] = [];
  const ANGLES = ["story", "lesson", "contrarian", "mistake", "insight"];
  
  // Deterministic rotation based on slots
  for (let i = 0; i < slots; i++) {
    let archetype = ARCHETYPE_ROTATION[i % ARCHETYPE_ROTATION.length];
    
    // REQUIREMENT: Weekly focus should only be used directly ONCE per week.
    // If we hit it again in the rotation (i >= 5) or if it's missing, fallback to other types.
    if (archetype === "WEEKLY_FOCUS" && (i >= ARCHETYPE_ROTATION.length || !weeklyFocus)) {
      archetype = "TOPIC_DEEP_DIVE";
    }

    // Assign source and value based on archetype
    if (archetype === "WEEKLY_FOCUS") {
      plan.push({ 
        source: "WEEKLY_FOCUS", 
        value: weeklyFocus, 
        archetype: "WEEKLY_FOCUS" 
      });
    } else if (archetype === "INDUSTRY_OBSERVATION") {
      const topic = topics[i % topics.length] || "Professional Growth";
      plan.push({ 
        source: "TOPIC", 
        value: topic, 
        archetype: "INDUSTRY_OBSERVATION" 
      });
    } else if (archetype === "OPINION") {
      const topic = topics[(i + 1) % topics.length] || "Industry Trends";
      plan.push({ 
        source: "TOPIC", 
        value: topic, 
        archetype: "OPINION",
        angle: "contrarian"
      });
    } else if (archetype === "GENERAL_NEWS") {
      const topic = topics[(i + 2) % topics.length] || "Market Insights";
      plan.push({ 
        source: "TOPIC", 
        value: topic, 
        archetype: "GENERAL_NEWS" 
      });
    } else {
      // TOPIC_DEEP_DIVE or fallback
      const topic = topics[(i + 3) % topics.length] || "Success Strategies";
      plan.push({ 
        source: "TOPIC", 
        value: topic, 
        archetype: "TOPIC_DEEP_DIVE",
        angle: ANGLES[i % ANGLES.length]
      });
    }
  }

  return plan;
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
  const weeklyFocus = user.autopilotCurrentFocus;

  // Archetype-specific prompt construction
  let usedFocusContext = false;
  
  switch (currentPlan.archetype) {
    case "WEEKLY_FOCUS":
      promptTopic = "Weekly Strategy / Theme";
      promptContext = `PRIMARY FOCUS: ${currentPlan.value}\n
Directly address this weekly focus. This is the central strategic anchor for this week. Use examples or insights directly related to this theme.`;
      usedFocusContext = true;
      break;

    case "INDUSTRY_OBSERVATION":
      promptTopic = currentPlan.value || topics[0];
      promptContext = `ARCHETYPE: Industry Observation.
Write an observational post about ${promptTopic}. Connect it to broader industry shifts or professional trends.
${weeklyFocus ? `STRATEGIC ANCHOR (Background): ${weeklyFocus}. Do NOT repeat this theme directly, but let it inform the tone and perspective.` : ""}
The goal is to provide a thoughtful "state of the industry" insight.`;
      if (weeklyFocus) usedFocusContext = true;
      break;

    case "OPINION":
      promptTopic = currentPlan.value || topics[0];
      promptContext = `ARCHETYPE: Opinion / Contrarian Insight.
Share a unique, perhaps slightly contrarian opinion or a hard-learned lesson about ${promptTopic}.
Be bold and provide a fresh perspective that challenges the status quo.`;
      // Intentionally kept generic, not influenced by focus
      break;

    case "GENERAL_NEWS":
      promptTopic = currentPlan.value || topics[0];
      promptContext = `ARCHETYPE: Market Shift / Behavioral Insight.
Discuss a recent trend, market shift, or behavioral insight related to ${promptTopic}.
Make the post feel timely, relevant, and grounded in current professional reality.`;
      // Intentionally kept generic, not influenced by focus
      break;

    case "TOPIC_DEEP_DIVE":
      promptTopic = currentPlan.value || topics[0];
      const angle = currentPlan.angle || "practical tip";
      promptContext = `ARCHETYPE: Practical Deep Dive.
Provide a specific ${angle} or a deep-dive lesson about ${promptTopic}.
Focus on actionable value and practical takeaways.`;
      // Intentionally kept generic, not influenced by focus
      break;
  }

  // Add personal context if available (but don't let it overpower the archetype)
  if (user.aboutYou) {
    promptContext += `\n\nUSER BACKGROUND (Use for voice/authority): ${user.aboutYou}`;
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
      autopilotFocus: usedFocusContext ? user.autopilotCurrentFocus : null,
      archetype: currentPlan.archetype,
    },
  });

  console.log(
    `[Generator] Created post | user=${userId} | day=${specificDay} | slot=${slot.toISOString()}`
  );

  return post;
}