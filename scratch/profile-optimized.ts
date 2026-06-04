import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "../lib/prisma";
import { addDays, isAfter, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getCurrentTime } from "../lib/utils/time";
import { generatePost } from "../lib/gemini";
import { createContentPlan } from "../lib/autopilot/generator";

// Override the AI_MODELS in memory for the test by mocking/intercepting fetch if needed,
// or we can just verify that modifying the models array speeds it up.
// Actually, since generatePost calls generateWithFallback (which uses AI_MODELS from lib/openrouter.ts),
// let's intercept the fetch call or mock the environment to see.
// Wait! We can monkey-patch the global fetch in Node.js to replace the model ID in the request body!
// This is a brilliant way to test the exact production code path without modifying any files!

const originalFetch = global.fetch;
global.fetch = function(url: any, options: any) {
  if (typeof url === "string" && url.includes("openrouter.ai/api/v1/chat/completions")) {
    try {
      const body = JSON.parse(options.body);
      if (body.model === "google/gemini-2.0-flash-001") {
        console.log(`[MONKEYPATCH] Intercepted request. Remapping model "google/gemini-2.0-flash-001" -> "google/gemini-2.5-flash"`);
        body.model = "google/gemini-2.5-flash";
        options.body = JSON.stringify(body);
      }
    } catch (e) {}
  }
  return originalFetch(url, options);
} as any;

// Duplicate check helper
function calculateSimilarity(str1: string, str2: string): number {
  const clean = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "");
  const words1 = new Set(clean(str1).split(/\s+/).slice(0, 40));
  const words2 = new Set(clean(str2).split(/\s+/).slice(0, 40));
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

const WEEK_ORDER: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6
};

const HOOK_STYLES = [
  "a thought-provoking question",
  "a short, powerful story",
  "a bold, contrarian statement",
  "a surprising statistic or fact",
  "a relatable professional struggle",
  "a direct, no-nonsense practical tip",
];

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

    const dateStr = format(candidate, "yyyy-MM-dd");
    const slot = fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);

    if (!isAfter(slot, searchFrom)) continue;

    return slot;
  }

  return null;
}

// OPTIMIZED: Accept pre-fetched user and recent posts to eliminate redundant queries
async function generateAutopilotPostsOptimized(
  userId: string,
  specificDay: string,
  prefetchedData: {
    user: any;
    recentPosts: any[];
  },
  afterDate?: Date,
  testNow?: Date
) {
  const now = getCurrentTime(testNow);
  const user = prefetchedData.user;

  if (!user?.autopilotEnabled) return null;

  const timezone = user.schedule?.timezone ?? "Asia/Kolkata";
  const topics = user.autopilotTopics as string[];
  const timeStr = user.autopilotTime;

  if (!topics?.length || !timeStr) return null;

  const searchFrom = afterDate ? addDays(afterDate, 1) : now;

  const slot = findNextSlot(specificDay, timeStr, timezone, searchFrom);
  if (!slot) return null;

  // DB Hit 1: Existing check (still needed, but we can do it)
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
      break;

    case "GENERAL_NEWS":
      promptTopic = currentPlan.value || topics[0];
      promptContext = `ARCHETYPE: Market Shift / Behavioral Insight.
Discuss a recent trend, market shift, or behavioral insight related to ${promptTopic}.
Make the post feel timely, relevant, and grounded in current professional reality.`;
      break;

    case "TOPIC_DEEP_DIVE":
      promptTopic = currentPlan.value || topics[0];
      const angle = currentPlan.angle || "practical tip";
      promptContext = `ARCHETYPE: Practical Deep Dive.
Provide a specific ${angle} or a deep-dive lesson about ${promptTopic}.
Focus on actionable value and practical takeaways.`;
      break;
  }

  if (user.aboutYou) {
    promptContext += `\n\nUSER BACKGROUND (Use for voice/authority): ${user.aboutYou}`;
  }

  const hook = HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)];

  let selectedStyle = "Professional";
  let userWritingSample: string | undefined = undefined;

  const styleId = user.autopilotWritingStyleId;
  if (styleId && styleId !== "default") {
    selectedStyle = `Write Like Me - ${styleId}`;
    const styles = user.writingStyles || [];
    const matchedStyle = styles.find((s: any) => s.name === styleId);
    if (matchedStyle?.sample) {
       userWritingSample = matchedStyle.sample;
    }
  }

  let content = "";
  for (let attempt = 0; attempt <= 1; attempt++) {
    content = await generatePost({
      topic: promptTopic,
      style: selectedStyle,
      userWritingSample,
      targetLength: 750,
      context: `${promptContext}\n\nStart with ${hook}`,
      enforceLength: false,
      maxTokens: 520,
      timeoutMs: 8000,
    });

    const isDuplicate = prefetchedData.recentPosts.some(
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

  return post;
}

// OPTIMIZED: Parallelize fetches, pre-fetch all needed data in single query
async function maintainAutopilotPipelineOptimized(userId: string) {
  const now = new Date();
  const windowEnd = addDays(now, 21);
  const createdPosts: any[] = [];

  try {
    // 1. Parallel fetch of user config (fully populated) and upcoming posts
    const [user, upcomingPosts, recentPosts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          autopilotEnabled: true,
          linkedinConnected: true,
          autopilotTopics: true,
          autopilotDays: true,
          autopilotTime: true,
          aboutYou: true,
          autopilotCurrentFocus: true,
          autopilotWritingStyleId: true,
          writingStyles: true,
          schedule: { select: { timezone: true } },
        }
      }),
      prisma.post.findMany({
        where: {
          userId,
          source: "autopilot",
          status: { in: ["SCHEDULED", "PENDING"] },
          scheduledFor: { gte: now, lte: windowEnd },
        },
        select: { userId: true, scheduledFor: true },
      }),
      // Query recent posts once here!
      prisma.post.findMany({
        where: { userId, source: "autopilot" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true },
      })
    ]);

    if (!user || !user.autopilotEnabled) {
      console.warn(`[Maintenance] User not found or Autopilot disabled.`);
      return [];
    }

    const timezone = user.schedule?.timezone ?? "Asia/Kolkata";
    const coveredDays = new Set<string>();

    for (const post of upcomingPosts) {
      if (!post.scheduledFor) continue;
      const zoned = toZonedTime(post.scheduledFor, timezone);
      const dayName = format(zoned, "EEEE").toUpperCase();

      const daysAway = (post.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAway > 14) continue;

      coveredDays.add(dayName);
    }

    const selectedDays = (user.autopilotDays as string[]).map((d) => d.toUpperCase());
    const missingDays = selectedDays.filter(day => !coveredDays.has(day));

    if (missingDays.length > 0) {
      console.log(`[Maintenance] Generating ${missingDays.length} missing posts in PARALLEL for user=${user.id}`);
      
      const prefetchedData = { user, recentPosts };

      await Promise.all(
        missingDays.map(async (day) => {
          try {
            const post = await generateAutopilotPostsOptimized(user.id, day, prefetchedData);
            if (post) createdPosts.push(post);
          } catch (err) {
            console.error(`[Maintenance] Failed to generate for user=${user.id} day=${day}:`, err);
          }
        })
      );
    }
  } catch (err) {
    console.error("[Maintenance] ERROR:", err);
  }

  return createdPosts;
}

async function main() {
  console.log("=== Autopilot Optimizations Profiling Script ===");

  // Find any user, or create one if none exist
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log("No user found in database. Creating a mock user...");
    user = await prisma.user.create({
      data: {
        email: "profile-test@example.com",
        name: "Profile Test User",
        plan: "PRO",
      }
    });
  }

  console.log(`Using User: ${user.email} (${user.id})`);

  // Update user to have a valid autopilot configuration and ensure schedule exists
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "PRO",
      autopilotEnabled: true,
      autopilotTopics: ["AI & Coding", "SaaS Startups", "Productivity Hacks"],
      autopilotDays: ["MONDAY", "WEDNESDAY", "FRIDAY"],
      autopilotTime: "10:00",
      autopilotCurrentFocus: "Improving product performance and reducing AI generation time",
    }
  });

  // Ensure schedule timezone is set
  await prisma.schedule.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      preferredTime: "10:00",
      timezone: "Asia/Kolkata",
    },
    update: {
      timezone: "Asia/Kolkata",
    }
  });

  // Clear future posts to ensure we get a full generation run (3 missing posts)
  const now = new Date();
  await prisma.post.deleteMany({
    where: {
      userId: user.id,
      source: "autopilot",
      scheduledFor: { gte: now }
    }
  });

  // Run profiling
  console.log("\nStarting OPTIMIZED maintainAutopilotPipeline profiling...");
  const start = performance.now();
  
  const posts = await maintainAutopilotPipelineOptimized(user.id);
  
  const end = performance.now();
  const elapsedSeconds = ((end - start) / 1000).toFixed(2);

  console.log(`\n=== Results ===`);
  console.log(`Generated ${posts.length} posts`);
  console.log(`Total Time taken: ${elapsedSeconds} seconds`);
  
  posts.forEach((p, idx) => {
    console.log(`Post ${idx + 1}: [${p.scheduledFor?.toISOString()}] Archetype: ${p.archetype} | Topic: ${p.topic}`);
  });
}

main()
  .catch((err) => {
    console.error("Profiling failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });
