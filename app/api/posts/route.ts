import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, status, scheduledFor, linkedinPostId } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If status is PUBLISHED, try to publish to LinkedIn first
    let finalLinkedinPostId = linkedinPostId;
    if (status === "PUBLISHED") {
      try {
        const result = await publishToLinkedIn(user.id, content);
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
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
