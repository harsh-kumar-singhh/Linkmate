import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { resolveUser } from "@/lib/auth/user";
import { prisma, withRetry } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await withRetry(() => prisma.post.findMany({
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
        // Exclude imageData for list view efficiency
      }
    }));

    const total = await withRetry(() => prisma.post.count({ where: { userId: user.id } }));

    return NextResponse.json({ 
      posts, 
      pagination: { 
        page, 
        limit, 
        total,
        totalPages: Math.ceil(total / limit)
      } 
    });
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    const message = error.name === "PrismaClientInitializationError" 
      ? "Database temporarily unavailable - waking up servers" 
      : "Failed to fetch posts";
    return NextResponse.json({ success: false, message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { content, status, scheduledFor, linkedinPostId, imageUrl, imageData, writingStyle, source } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Harden flow: Create record first as PENDING if status is PUBLISHED
    let post = await withRetry(() => prisma.post.create({
      data: {
        userId: user.id,
        content,
        status: status === "PUBLISHED" ? "PENDING" : (status || "DRAFT"),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        imageUrl: imageUrl || null,
        imageData: imageData || null,
        writingStyle: writingStyle || null,
        source: source || "MANUAL",
      } as any,
    }));

    // If status is PUBLISHED, try to publish to LinkedIn
    if (status === "PUBLISHED") {
      try {
        const result = await publishToLinkedIn(user.id, content, imageUrl, imageData);
        
        post = await withRetry(() => prisma.post.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            linkedinPostId: result.linkedinPostId,
          }
        }));
      } catch (error) {
        console.error("LinkedIn publishing failed:", error);
        
        await withRetry(() => prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            failureReason: error instanceof Error ? error.message : "Failed to publish"
          }
        }));

        return NextResponse.json(
          { error: error instanceof Error ? error.message : "LinkedIn publishing failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error("Error creating post:", error);
    const message = error.name === "PrismaClientInitializationError" 
      ? "Database temporarily unavailable - waking up servers" 
      : "Failed to create post";
    return NextResponse.json({ success: false, message }, { status: 503 });
  }
}
