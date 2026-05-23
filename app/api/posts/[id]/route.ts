export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";
import { revalidateTag } from "next/cache";
import { dashboardCache } from "@/lib/cache-server";
import { sendPostPublishedNotification } from "@/lib/notifications";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized", message: "Unauthorized" }, { status: 401 });
        }

        const post = await prisma.post.findUnique({
            where: { id: params.id },
        });

        if (!post) {
            return NextResponse.json({ success: false, error: "Post not found", message: "Post not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: post,
            message: "Post fetched successfully"
        });
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch post", message: "Failed to fetch post" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized", message: "Unauthorized" }, { status: 401 });
        }

        const postId = params.id;
        if (!postId || postId === 'undefined' || postId === 'null') {
            return NextResponse.json({ success: false, error: "Invalid post ID", message: "Invalid post ID" }, { status: 400 });
        }

        const { content, status, scheduledFor, imageUrl, imageData, writingStyle } = await req.json();

        let finalLinkedinPostId = undefined;
        if (status === "PUBLISHED") {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
            });

            if (!user) {
                return NextResponse.json({ success: false, error: "User not found", message: "User not found" }, { status: 404 });
            }

            try {
                const result = await publishToLinkedIn(user.id, content, imageUrl, imageData);
                finalLinkedinPostId = result.linkedinPostId;
            } catch (error: any) {
                console.error("LinkedIn publishing failed:", error);
                return NextResponse.json(
                    { success: false, error: error.message, message: "LinkedIn publishing failed" },
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
                notified: status === "PUBLISHED" ? true : undefined,
                imageUrl: imageUrl !== undefined ? imageUrl : undefined,
                imageData: imageData !== undefined ? imageData : undefined,
                writingStyle: writingStyle !== undefined ? writingStyle : undefined,
                userModified: true,
            } as any,
        });

        // Trigger push notification only after LinkedIn succeeded and the DB row is PUBLISHED.
        if (status === "PUBLISHED") {
            console.log(`[PUBLISH] Post successfully published | post=${post.id} | user=${session.user.id} | linkedinPostId=${finalLinkedinPostId}`);
            try {
                await sendPostPublishedNotification({
                    userId: session.user.id,
                    postContent: content,
                    postId: post.id,
                });
            } catch (notifyError) {
                console.error("[POSTS] Push notification failed for manual publish (PUT):", notifyError);
            }
        }

        // Bust cache
        const userId = session.user.id;
        revalidateTag(`dashboard:${userId}`);
        dashboardCache.delete(`dashboard:${userId}`);

        return NextResponse.json({
            success: true,
            data: post,
            message: "Post updated successfully"
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ success: false, error: "Post not found", message: "Post not found" }, { status: 404 });
        }
        console.error("Error updating post:", error);
        return NextResponse.json({ success: false, error: "Failed to update post", message: "Failed to update post" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized", message: "Unauthorized" }, { status: 401 });
        }

        const postId = params.id;
        if (!postId || postId === 'undefined' || postId === 'null') {
            return NextResponse.json({ success: false, error: "Invalid post ID", message: "Invalid post ID" }, { status: 400 });
        }

        await prisma.post.delete({
            where: { id: postId },
        });

        // Bust cache
        const userId = session.user.id;
        revalidateTag(`dashboard:${userId}`);
        dashboardCache.delete(`dashboard:${userId}`);

        return NextResponse.json({ 
            success: true, 
            message: "Post deleted successfully" 
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ success: true, message: "Post already deleted" });
        }
        console.error("Error deleting post:", error);
        return NextResponse.json({ success: false, error: "Failed to delete post", message: "Failed to delete post" }, { status: 500 });
    }
}
