export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generatePost } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { topic, style } = await req.json();

        let userWritingSample = undefined;

        // If style is "Write Like Me", fetch user's stored style
        if (style === "Write Like Me") {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { writingStyle: true }
            });
            if (user?.writingStyle) {
                userWritingSample = user.writingStyle;
            }
        }

        const content = await generatePost({ topic, style, userWritingSample });
        return NextResponse.json({ content });
    } catch (error) {
        console.error("AI Generation Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate post";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
