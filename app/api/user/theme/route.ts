export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { theme } = await req.json();

        if (!theme || !["light", "dark", "system"].includes(theme)) {
            return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { theme }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating theme:", error);
        return NextResponse.json({ error: "Failed to update theme" }, { status: 500 });
    }
}
