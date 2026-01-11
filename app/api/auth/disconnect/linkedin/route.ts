import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
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

        // Delete the LinkedIn account associated with this user
        await prisma.account.deleteMany({
            where: {
                userId: user.id,
                provider: "linkedin",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error disconnecting LinkedIn:", error);
        return NextResponse.json({ error: "Failed to disconnect LinkedIn" }, { status: 500 });
    }
}
