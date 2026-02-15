import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { resolveUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET() {
  const prisma = getPrisma();
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const prisma = getPrisma();
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { content, status, scheduledFor, linkedinPostId, imageUrl, imageData, writingStyle, source } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // If status is PUBLISHED, try to publish to LinkedIn first
    let finalLinkedinPostId = linkedinPostId;
    if (status === "PUBLISHED") {
      try {
        // @ts-ignore - Ignore type desync for new imageData field
        const result = await publishToLinkedIn(user.id, content, imageUrl, imageData);
        finalLinkedinPostId = result.linkedinPostId;
      } catch (error) {
        console.error("LinkedIn publishing failed:", error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to publish to LinkedIn" },
          { status: 500 }
        );
      }
    }

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content,
        status: status || "DRAFT", // DRAFT, SCHEDULED, PUBLISHED
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        linkedinPostId: finalLinkedinPostId,
        imageUrl: imageUrl || null,
        imageData: imageData || null,
        writingStyle: writingStyle || null,
        source: source || "MANUAL",
      } as any,
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
