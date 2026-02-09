export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const postId = params.id;
        if (!postId || postId === 'undefined' || postId === 'null') {
            console.warn("[POST_NOTIFIED] Skipping update: Invalid or missing postId");
            return NextResponse.json({ success: true, message: "Update skipped: invalid postId" });
        }

        const prisma = getPrisma();
        const post = await prisma.post.update({
            where: {
                id: postId,
                userId: session.user.id
            },
            data: { notified: true }
        });

        return NextResponse.json({ success: true, post });
    } catch (error: any) {
        // Catch Prisma P2025 specifically
        if (error.code === 'P2025') {
            console.warn(`[POST_NOTIFIED] Skip: Post ${params.id} not found in DB`);
            return NextResponse.json({ success: true, message: "Post not found, skipped" });
        }
        console.error("[POST_NOTIFIED] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
