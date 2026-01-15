export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function PUT(req: Request) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { writingStyle } = await req.json();

        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: { writingStyle },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error("Settings Update Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
