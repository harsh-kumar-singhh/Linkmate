export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST() {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 1. Delete the LinkedIn account associated with this user
        await prisma.account.deleteMany({
            where: {
                userId: user.id,
                provider: "linkedin",
            },
        });

        // 2. Explicitly update the user flag for synchronization
        await prisma.user.update({
            where: { id: user.id },
            data: { linkedinConnected: false }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error disconnecting LinkedIn:", error);
        return NextResponse.json({ error: "Failed to disconnect LinkedIn" }, { status: 500 });
    }
}
