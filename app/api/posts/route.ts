import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
export const dynamic = "force-dynamic";
import { resolveUser } from "@/lib/auth/user";
import { prisma, withRetry } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";
import { dashboardCache } from "@/lib/cache-server";
import { sendPostPublishedNotification, triggerDraftSavedNotification } from "@/lib/notifications";

// ============================================================
// GET /api/posts — Fetch paginated posts for the current user
// ============================================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const posts = await withRetry(() =>
      prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          status: true,
          scheduledFor: true,
          publishedAt: true,
          linkedinPostId: true,
          imageUrl: true,
          writingStyle: true,
          createdAt: true,
          source: true,
        },
      })
    );

    const total = await withRetry(() =>
      prisma.post.count({ where: { userId: user.id } })
    );

    const response = NextResponse.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: "Posts fetched successfully",
    });

    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    const message =
      error.name === "PrismaClientInitializationError"
        ? "Database temporarily unavailable - waking up servers"
        : "Failed to fetch posts";
    return NextResponse.json(
      { success: false, error: error.message, message },
      { status: 503 }
    );
  }
}

// ============================================================
// POST /api/posts — Create, schedule, or manually publish a post
// ============================================================
export async function POST(req: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      content,
      status,
      scheduledFor,
      linkedinPostId,
      imageUrl,
      imageData,
      writingStyle,
      source,
    } = await req.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Content is required", message: "Content is required" },
        { status: 400 }
      );
    }

    // Create as PENDING first if we intend to publish immediately.
    // This ensures a record exists even if LinkedIn publish crashes.
    let post = await withRetry(() =>
      prisma.post.create({
        data: {
          userId: user.id,
          content,
          status: status === "PUBLISHED" ? "PENDING" : status || "DRAFT",
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          imageUrl: imageUrl || null,
          imageData: imageData || null,
          writingStyle: writingStyle || null,
          source: source || "MANUAL",
        } as any,
      })
    );

    // ============================================================
    // Manual publish path
    // ============================================================
    if (status === "PUBLISHED") {
      try {
        const result = await publishToLinkedIn(user.id, content, imageUrl, imageData);

        post = await withRetry(() =>
          prisma.post.update({
            where: { id: post.id },
            data: {
              status: "PUBLISHED",
              publishedAt: new Date(),
              linkedinPostId: result.linkedinPostId,
              notified: true,
            },
          })
        );

        console.log(`[PUBLISH] Post successfully published | post=${post.id} | user=${user.id} | linkedinPostId=${result.linkedinPostId}`);

        try {
          await sendPostPublishedNotification({
            userId: user.id,
            postContent: content,
            postId: post.id,
          });
        } catch (notifyError) {
          console.error("[POSTS] Push notification failed for manual publish:", notifyError);
        }

      } catch (error: any) {
        console.error("LinkedIn publishing failed:", error);

        await withRetry(() =>
          prisma.post.update({
            where: { id: post.id },
            data: {
              status: "FAILED",
              failureReason: error instanceof Error ? error.message : "Failed to publish",
            },
          })
        );

        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "LinkedIn publishing failed",
            message: "Failed to publish to LinkedIn. Post saved as FAILED.",
          },
          { status: 500 }
        );
      }
    } else if (status === "DRAFT" || !status) {
      triggerDraftSavedNotification(user.id, content, post.id).catch((notifyError) => {
        console.error("[POSTS] Push notification failed for saving draft:", notifyError);
      });
    }

    // Invalidate dashboard cache for this user
    revalidateTag(`dashboard:${user.id}`);
    revalidatePath("/dashboard");
    dashboardCache.delete(`dashboard:${user.id}`);

    return NextResponse.json({
      success: true,
      data: post,
      message:
        status === "PUBLISHED"
          ? "Post published successfully"
          : status === "SCHEDULED"
          ? "Post scheduled"
          : "Draft saved",
    });
  } catch (error: any) {
    console.error("Error creating post:", error);
    const message =
      error.name === "PrismaClientInitializationError"
        ? "Database temporarily unavailable - waking up servers"
        : "Failed to create post";
    return NextResponse.json(
      { success: false, error: error.message, message },
      { status: 503 }
    );
  }
}
