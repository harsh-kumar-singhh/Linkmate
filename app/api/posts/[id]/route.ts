export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const post = await prisma.post.findUnique({
            where: { id: params.id },
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        return NextResponse.json(post);
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const postId = params.id;
        if (!postId || postId === 'undefined' || postId === 'null') {
            console.warn("[POST_UPDATE] Skipping: Invalid or missing postId");
            return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
        }

        const { content, status, scheduledFor, imageUrl } = await req.json();

        // If status is being updated to PUBLISHED, try to publish to LinkedIn
        let finalLinkedinPostId = undefined;
        if (status === "PUBLISHED") {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
            });

            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            try {
                const result = await publishToLinkedIn(user.id, content, imageUrl);
                finalLinkedinPostId = result.linkedinPostId;
            } catch (error) {
                console.error("LinkedIn publishing failed:", error);
                return NextResponse.json(
                    { error: error instanceof Error ? error.message : "Failed to publish to LinkedIn" },
                    { status: 500 }
                );
            }
        }

        const post = await prisma.post.update({
            where: { id: postId },
            data: {
                content,
                status,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
                publishedAt: status === "PUBLISHED" ? new Date() : null,
                linkedinPostId: finalLinkedinPostId,
                imageUrl: imageUrl !== undefined ? imageUrl : undefined,
            },
        });

        return NextResponse.json(post);
    } catch (error: any) {
        if (error.code === 'P2025') {
            console.warn(`[POST_UPDATE] Skip: Post ${params.id} not found`);
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }
        console.error("Error updating post:", error);
        return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const postId = params.id;
        if (!postId || postId === 'undefined' || postId === 'null') {
            console.warn("[POST_DELETE] Skipping: Invalid or missing postId");
            return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
        }

        await prisma.post.delete({
            where: { id: postId },
        });

        return NextResponse.json({ message: "Post deleted successfully" });
    } catch (error: any) {
        if (error.code === 'P2025') {
            console.warn(`[POST_DELETE] Skip: Post ${params.id} already deleted or not found`);
            return NextResponse.json({ message: "Post already deleted" });
        }
        console.error("Error deleting post:", error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
