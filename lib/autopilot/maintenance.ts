import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "./generator";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const ACTIVE_RUNS = new Map<string, number>();
const RUN_THROTTLE_MS = 30_000;

function isThrottled(userId: string): boolean {
  const last = ACTIVE_RUNS.get(userId);
  if (last && Date.now() - last < RUN_THROTTLE_MS) return true;
  ACTIVE_RUNS.set(userId, Date.now());
  return false;
}

export async function maintainAutopilotPipeline(userId?: string) {
  const now = new Date();
  const windowEnd = addDays(now, 21);

  if (userId && isThrottled(userId)) return;

  try {
    const users = await prisma.user.findMany({
      where: {
        id: userId ?? undefined,
        autopilotEnabled: true,
        linkedinConnected: true,
        autopilotTopics: { not: { equals: [] } },
        NOT: [{ autopilotDays: { equals: [] } }, { autopilotTime: null }],
      },
      select: {
        id: true,
        autopilotDays: true,
        schedule: { select: { timezone: true } },
      },
      take: userId ? 1 : 20,
    });

    if (!users.length) return;

    const upcomingPosts = await prisma.post.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        source: "autopilot",
        status: { in: ["SCHEDULED", "PENDING"] },
        scheduledFor: { gte: now, lte: windowEnd },
      },
      select: { userId: true, scheduledFor: true },
    });

    // Only count posts within next 14 days as "covering" a slot
    // This prevents a post 20 days away from blocking a near-term gap
    const coveredDays = new Map<string, Set<string>>();

    for (const post of upcomingPosts) {
      if (!post.scheduledFor) continue;
      const user = users.find((u) => u.id === post.userId);
      if (!user) continue;

      const timezone = user.schedule?.timezone ?? "Asia/Kolkata";
      const zoned = toZonedTime(post.scheduledFor, timezone);
      const dayName = format(zoned, "EEEE").toUpperCase();

      const daysAway =
        (post.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAway > 14) continue;

      if (!coveredDays.has(post.userId)) {
        coveredDays.set(post.userId, new Set());
      }
      coveredDays.get(post.userId)!.add(dayName);
    }

    for (const user of users) {
      const selectedDays = (user.autopilotDays as string[]).map((d) =>
        d.toUpperCase()
      );
      const covered = coveredDays.get(user.id) ?? new Set<string>();

      for (const day of selectedDays) {
        if (!covered.has(day)) {
          console.log(
            `[Maintenance] Generating missing post | user=${user.id} | day=${day}`
          );
          await generateAutopilotPosts(user.id, day);
        }
      }
    }
  } catch (err) {
    console.error("[Maintenance] ERROR:", err);
  }
}

// ── THE MISSING PIECE ──────────────────────────────────────────────────────
// Call this right after a post is successfully published to LinkedIn.
// It generates the next occurrence of the same weekday, keeping the
// rolling pipeline alive automatically.
export async function refillAfterPublish(userId: string, publishedDate: Date) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        autopilotEnabled: true,
        autopilotDays: true,
        schedule: { select: { timezone: true } },
      },
    });

    if (!user?.autopilotEnabled) return;

    const timezone = user.schedule?.timezone ?? "Asia/Kolkata";
    const zoned = toZonedTime(publishedDate, timezone);
    const dayName = format(zoned, "EEEE").toUpperCase();

    const selectedDays = (user.autopilotDays as string[]).map((d) =>
      d.toUpperCase()
    );

    if (!selectedDays.includes(dayName)) return;

    console.log(
      `[Refill] Post published | user=${userId} | day=${dayName} | generating next ${dayName}...`
    );

    // Pass publishedDate as afterDate so generator skips to NEXT week
    const newPost = await generateAutopilotPosts(userId, dayName, publishedDate);

    if (newPost) {
      console.log(
        `[Refill] Next ${dayName} post scheduled at ${newPost.scheduledFor?.toISOString()}`
      );
    } else {
      console.warn(`[Refill] Could not generate next ${dayName} for user=${userId}`);
    }
  } catch (err) {
    console.error("[Refill] ERROR:", err);
  }
}

export async function reconcileAutopilotSchedule(
  userId: string,
  newDays: string[]
) {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schedule: { select: { timezone: true } } },
  });

  const timezone = user?.schedule?.timezone ?? "Asia/Kolkata";
  const normalizedDays = newDays.map((d) => d.toUpperCase());

  const futurePosts = await prisma.post.findMany({
    where: {
      userId,
      status: { in: ["SCHEDULED", "PENDING"] },
      source: "autopilot",
      scheduledFor: { gte: now },
    },
    select: { id: true, scheduledFor: true },
  });

  const toDelete = futurePosts
    .filter((p) => {
      if (!p.scheduledFor) return false;
      const zoned = toZonedTime(p.scheduledFor, timezone);
      const day = format(zoned, "EEEE").toUpperCase();
      return !normalizedDays.includes(day);
    })
    .map((p) => p.id);

  if (toDelete.length > 0) {
    await prisma.post.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`[Reconcile] Deleted ${toDelete.length} stale posts for user=${userId}`);
  }
}