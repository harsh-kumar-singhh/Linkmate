export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function PUT(req: Request) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { writingStyle, name, theme } = await req.json();

        const data: any = {};
        if (writingStyle !== undefined) data.writingStyle = writingStyle;
        if (name !== undefined) data.name = name;
        if (theme !== undefined) data.theme = theme;

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data,
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error("Settings Update Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
