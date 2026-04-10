export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
    try {
        const userRecord = await resolveUser();
        if (!userRecord) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { writingStyles, name, theme, defaultTone, aboutYou } = await req.json();

        const data: any = {};
        if (writingStyles !== undefined) {
            // Enforce plan limits for writing styles
            if (userRecord.plan?.toUpperCase() !== "PRO" && Array.isArray(writingStyles)) {
                // Keep only the first style that has content, or just the first slot
                data.writingStyles = writingStyles.slice(0, 1);
            } else {
                data.writingStyles = writingStyles;
            }
        }
        if (name !== undefined) data.name = name;
        if (theme !== undefined) data.theme = theme;
        if (defaultTone !== undefined) data.defaultTone = defaultTone;
        if (aboutYou !== undefined) data.aboutYou = aboutYou;

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
