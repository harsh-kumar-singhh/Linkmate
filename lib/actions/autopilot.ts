"use server";

// lib/actions/autopilot.ts
//
// FIXES:
// 1. Removed dashboardCache import and all dashboardCache.delete() calls.
//    In-memory Map is process-local — useless in serverless multi-instance
//    environments. unstable_cache + revalidateTag is the single source of truth.
// 2. Removed debug console.log for autopilot time (was firing in production).

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  maintainAutopilotPipeline,
  reconcileAutopilotSchedule,
  refillAfterPublish,
  syncAutopilotWeeklyFocus,
} from "@/lib/autopilot/maintenance";
import { sendPostPublishedNotification } from "@/lib/notifications";

export async function saveAutopilotSettings(data: {
  topics: string[];
  frequency: string;
  days: string[];
  time: string;
  currentFocus?: string;
  writingStyleId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true, autopilotCurrentFocus: true },
  });

  if (user?.plan?.toUpperCase() !== "PRO") {
    throw new Error("Pro plan required for Autopilot");
  }

  if (data.topics.length < 1) {
    throw new Error("Please select at least one topic");
  }

  if (data.days.length === 0) {
    throw new Error("Please select at least one posting day");
  }

  const frequencyNum = parseInt(data.frequency);
  if (frequencyNum < 1 || frequencyNum > data.days.length) {
    throw new Error(`Frequency must be between 1 and ${data.days.length}`);
  }

  const focusChanged = user.autopilotCurrentFocus !== data.currentFocus;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      autopilotEnabled: true,
      autopilotTopics: data.topics,
      autopilotFrequency: data.frequency,
      autopilotDays: data.days,
      autopilotTime: data.time,
      autopilotCurrentFocus: data.currentFocus,
      autopilotWritingStyleId: data.writingStyleId,
    },
  });

  // reconcileAutopilotSchedule must complete before maintainAutopilotPipeline
  // (pipeline needs post state after reconciliation). Sequential is correct here.
  // syncAutopilotWeeklyFocus is independent — run it in parallel with reconcile.
  const [focusSyncResult, deletedPostIds] = await Promise.all([
    focusChanged
      ? syncAutopilotWeeklyFocus(session.user.id, data.currentFocus || "")
      : Promise.resolve({ deletedPostIds: [], posts: [] }),
    reconcileAutopilotSchedule(session.user.id, data.days),
  ]);

  const newPosts = await maintainAutopilotPipeline(session.user.id, true);
  const posts = [...focusSyncResult.posts, ...newPosts].sort((a, b) => {
    if (!a.scheduledFor) return 1;
    if (!b.scheduledFor) return -1;
    return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
  });

  revalidatePath("/calendar");
  // FIX: single cache layer — revalidateTag only, no dashboardCache.delete()
  revalidateTag(`dashboard:${session.user.id}`);

  return { success: true, posts, deletedPostIds: [...focusSyncResult.deletedPostIds, ...deletedPostIds] };
}

export async function toggleAutopilot(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { autopilotEnabled: enabled },
    }),
    prisma.post.updateMany({
      where: {
        userId: session.user.id,
        source: "autopilot",
        scheduledFor: { gt: now },
      },
      data: { status: enabled ? "SCHEDULED" : "PAUSED" },
    }),
  ]);

  let newPosts: any[] = [];
  if (enabled) {
    newPosts = await maintainAutopilotPipeline(session.user.id, true).catch((err) => {
      console.error("[Toggle] Maintenance failed:", err);
      return [];
    });
  }

  revalidatePath("/calendar");
  // FIX: single cache layer — revalidateTag only
  revalidateTag(`dashboard:${session.user.id}`);

  return { success: true, posts: newPosts };
}

// ── CALL THIS AFTER EVERY SUCCESSFUL LINKEDIN PUBLISH ─────────────────────
export async function markPostPublished(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true, content: true, scheduledFor: true, source: true },
  });

  if (!post) throw new Error("Post not found");
  if (post.userId !== session.user.id) throw new Error("Forbidden");

  const publishedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      notified: true,
    },
  });

  console.log(`[PUBLISH] Post successfully published | post=${publishedPost.id} | user=${publishedPost.userId} | source=${post.source}`);
  await sendPostPublishedNotification({
    userId: publishedPost.userId,
    postContent: publishedPost.content,
    postId: publishedPost.id,
  });

  // Refill autopilot pipeline after a post publishes
  if (post.source === "autopilot" && post.scheduledFor) {
    await refillAfterPublish(post.userId, post.scheduledFor);
  }

  revalidatePath("/calendar");
  // FIX: single cache layer — revalidateTag only
  revalidateTag(`dashboard:${session.user.id}`);

  return { success: true };
}
