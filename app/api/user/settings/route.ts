export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/prisma";

export async function PUT(req: Request) {
    const prisma = getPrisma();
    try {
        const userRecord = await resolveUser();
        if (!userRecord) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { writingStyles, name, theme, defaultTone } = await req.json();

        const data: any = {};
        if (writingStyles !== undefined) data.writingStyles = writingStyles;
        if (name !== undefined) data.name = name;
        if (theme !== undefined) data.theme = theme;
        if (defaultTone !== undefined) data.defaultTone = defaultTone;

        const updatedUser = await prisma.user.update({
            where: { id: userRecord.id },
            data,
        } as any);

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Settings Update Error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
