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
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const prisma = getPrisma();
        const post = await prisma.post.update({
            where: {
                id: params.id,
                userId: session.user.id
            },
            data: { notified: true }
        });

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error("[NOTIFIED_PATCH] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
