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

        const { topic, style, targetLength, context } = await req.json();

        // Fetch User Data for Styles
        let userWritingSample = undefined;

        if (style === "Write Like Me" || style?.startsWith("Custom Style")) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    writingStyle: true,
                    // @ts-ignore - Prisma client sync lag
                    customStyles: true
                }
            });

            if (user) {
                if (style === "Write Like Me") {
                    userWritingSample = user.writingStyle || undefined;
                } else if (style?.startsWith("Custom Style")) {
                    // Extract index: "Custom Style 1" -> 0
                    const index = parseInt(style.split(" ")[2]) - 1;
                    // @ts-ignore - Prisma client sync lag
                    if (user.customStyles && user.customStyles[index]) {
                        // @ts-ignore - Prisma client sync lag
                        userWritingSample = user.customStyles[index];
                    }
                }
            }
        }

        const content = await generatePost({ topic, style, userWritingSample, targetLength, context });
        return NextResponse.json({ content });
    } catch (error) {
        console.error("AI Generation Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate post";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
