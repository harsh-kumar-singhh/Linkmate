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

export async function maintainAutopilotPipeline(userId?: string, force: boolean = false) {
  const now = new Date();
  const windowEnd = addDays(now, 21);

  if (userId && !force && isThrottled(userId)) return [];

  const createdPosts: any[] = [];



  try {
    const userCount = await prisma.user.count({
      where: { id: userId ?? undefined }
    });

    if (userId && userCount === 0) {
      console.warn(`[Maintenance] User ${userId} not found in database.`);
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        id: userId ?? undefined,
        autopilotEnabled: true,
        // linkedinConnected: true, // Temporarily relaxed for direct userId calls to help debugging
        autopilotTopics: { not: { equals: [] } },
        NOT: [{ autopilotDays: { equals: [] } }, { autopilotTime: null }],
      },
      select: {
        id: true,
        autopilotEnabled: true,
        linkedinConnected: true,
        autopilotTopics: true,
        autopilotDays: true,
        autopilotTime: true,
        schedule: { select: { timezone: true } },
      },
      take: userId ? 1 : 20,
    });

    if (userId && users.length === 0) {
      // Find out exactly why the user was filtered out
      const rawUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { autopilotEnabled: true, autopilotTopics: true, autopilotDays: true, autopilotTime: true, linkedinConnected: true }
      });
      console.warn(`[Maintenance] User ${userId} filtered out of pipeline. Status:`, {
        exists: !!rawUser,
        enabled: rawUser?.autopilotEnabled,
        topics: (rawUser?.autopilotTopics as any[])?.length || 0,
        days: rawUser?.autopilotDays?.length || 0,
        time: !!rawUser?.autopilotTime,
        linkedin: rawUser?.linkedinConnected
      });
      return [];
    }

    if (!users.length) return [];

    // If we're doing a bulk run, we still enforce linkedinConnected
    const activeUsers = userId ? users : users.filter(u => u.linkedinConnected);
    
    if (activeUsers.length === 0) {
      console.log("[Maintenance] No users with LinkedIn connected found for bulk processing.");
      return [];
    }

    const upcomingPosts = await prisma.post.findMany({
      where: {
        userId: { in: activeUsers.map((u) => u.id) },
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

    for (const user of activeUsers) {
      const selectedDays = (user.autopilotDays as string[]).map((d) =>
        d.toUpperCase()
      );
      const covered = coveredDays.get(user.id) ?? new Set<string>();
      const missingDays = selectedDays.filter(day => !covered.has(day));

      if (missingDays.length > 0) {
        console.log(
          `[Maintenance] Generating ${missingDays.length} missing posts in PARALLEL for user=${user.id}`
        );
        
        // Generate all missing posts in parallel for maximum speed
        await Promise.all(
          missingDays.map(async (day) => {
            try {
              const post = await generateAutopilotPosts(user.id, day);
              if (post) createdPosts.push(post);
            } catch (err) {
              console.error(`[Maintenance] Failed to generate for user=${user.id} day=${day}:`, err);
            }
          })
        );
      }
    }
  } catch (err) {
    console.error("[Maintenance] ERROR:", err);
  }

  return createdPosts;
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
  return toDelete;
}

/**
 * SELECTIVE REGENERATION:
 * When the weekly focus changes, we only want to replace future posts that were
 * directly influenced by the OLD weekly focus.
 */
export async function syncAutopilotWeeklyFocus(userId: string, newFocus: string) {
    const now = new Date();
    
    // 1. Identify future autopilot posts influenced by focus
    const futurePosts = await prisma.post.findMany({
        where: {
            userId,
            source: "autopilot",
            status: { in: ["SCHEDULED", "PENDING"] },
            scheduledFor: { gte: now },
            // Only posts where archetype was WEEKLY_FOCUS OR it was influenced by focus
            OR: [
                { archetype: "WEEKLY_FOCUS" },
                { 
                    // If metadata was old, we might check if autopilotFocus exists and is different
                    AND: [
                        { autopilotFocus: { not: newFocus } },
                        { autopilotFocus: { not: null } }
                    ]
                }
            ]
        },
        select: { id: true, autopilotFocus: true, archetype: true }
    });

    if (futurePosts.length === 0) return { deletedPostIds: [], posts: [] };

    // 2. Delete only the ones that match the "stale focus" criteria
    // We keep generic topic posts (archetype != WEEKLY_FOCUS and no direct focus anchor, which have autopilotFocus = null)
    const staleIds = futurePosts
        .filter(p => p.archetype === "WEEKLY_FOCUS" || (p.autopilotFocus && p.autopilotFocus !== newFocus))
        .map(p => p.id);

    let posts: any[] = [];
    if (staleIds.length > 0) {
        await prisma.post.deleteMany({
            where: { id: { in: staleIds } }
        });
        console.log(`[FocusSync] Deleted ${staleIds.length} stale focus-influenced posts for user=${userId}`);
        
        // 3. Trigger maintenance to refill gaps with NEW focus
        posts = await maintainAutopilotPipeline(userId, true);
    }

    return { deletedPostIds: staleIds, posts };
}