"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { dashboardCache } from "@/lib/cache-server";
import {
  maintainAutopilotPipeline,
  reconcileAutopilotSchedule,
  refillAfterPublish,
} from "@/lib/autopilot/maintenance";

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

  // ✅ DEBUG LOG (DO NOT REMOVE YET)
  console.log("[Autopilot-Settings] Raw time received:", data.time);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true },
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

  const deletedPostIds = await reconcileAutopilotSchedule(session.user.id, data.days);
  const newPosts = await maintainAutopilotPipeline(session.user.id, true);

  revalidatePath("/calendar");
  revalidateTag("dashboard");
  dashboardCache.delete(`dashboard:${session.user.id}`);

  return { success: true, posts: newPosts, deletedPostIds };
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
  revalidateTag("dashboard");
  dashboardCache.delete(`dashboard:${session.user.id}`);

  return { success: true, posts: newPosts };
}

// ── CALL THIS AFTER EVERY SUCCESSFUL LINKEDIN PUBLISH ─────────────────────
export async function markPostPublished(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true, scheduledFor: true, source: true },
  });

  if (!post) throw new Error("Post not found");
  if (post.userId !== session.user.id) throw new Error("Forbidden");

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  // ✅ Refill pipeline
  if (post.source === "autopilot" && post.scheduledFor) {
    await refillAfterPublish(post.userId, post.scheduledFor);
  }

  revalidatePath("/calendar");
  revalidateTag("dashboard");
  dashboardCache.delete(`dashboard:${session.user.id}`);

  return { success: true };
}