export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user?.email) {
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
    try {
        const session = await auth();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content, status, scheduledFor } = await req.json();

        // If status is being updated to PUBLISHED, try to publish to LinkedIn
        let finalLinkedinPostId = undefined;
        if (status === "PUBLISHED") {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
            });

            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

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

        const post = await prisma.post.update({
            where: { id: params.id },
            data: {
                content,
                status,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
                publishedAt: status === "PUBLISHED" ? new Date() : null,
                linkedinPostId: finalLinkedinPostId,
            },
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error("Error updating post:", error);
        return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.post.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
