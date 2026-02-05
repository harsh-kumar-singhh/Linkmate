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

        // Fetch User Data for Write Like Me styles
        let userWritingSample = undefined;

        if (style && style.includes("Write Like Me")) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    writingStyles: true,
                    writingStyle: true,
                    customStyles: true
                }
            } as any);

            if (user) {
                // Bridge logic: combine legacy and new styles
                let styles = (user as any).writingStyles || [];
                if (styles.length === 0) {
                    if ((user as any).writingStyle) styles.push({ name: "Legacy (Main)", sample: (user as any).writingStyle });
                    if ((user as any).customStyles) {
                        (user as any).customStyles.forEach((s: string, i: number) => {
                            if (s) styles.push({ name: `Legacy (Extra ${i + 1})`, sample: s });
                        });
                    }
                }

                const parts = style.split(/[\u2014\u2013-]/);
                const styleName = parts.length > 1 ? parts[parts.length - 1].trim().toLowerCase() : "";

                const matchedStyle = (styles as any[]).find(
                    (s: any) => s.name?.trim().toLowerCase() === styleName
                );

                if (matchedStyle?.sample) {
                    userWritingSample = matchedStyle.sample;
                    console.log(`[GENERATE] Using writing style: ${matchedStyle.name}`);
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
