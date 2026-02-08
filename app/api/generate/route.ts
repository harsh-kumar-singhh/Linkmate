export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { generateWithFallback, getPublicErrorMessage } from "@/lib/openrouter";
import { checkAndIncrementAIQuota } from "@/lib/usage";

export async function POST(req: Request) {
    const prisma = getPrisma();
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.warn("[GENERATE] No authenticated session found");
            return NextResponse.json(
                { error: "Your session has expired. Please refresh the page or sign in again." },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        const { topic, style, targetLength = 1000, context } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        // --- VERIFY USER EXISTS IN DATABASE ---
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });

        if (!userExists) {
            console.warn(`[GENERATE] User ${userId} not found in database`);
            return NextResponse.json(
                { error: "Your session has expired. Please refresh the page or sign in again." },
                { status: 401 }
            );
        }

        // --- ENFORCE DAILY QUOTA ---
        const quota = await checkAndIncrementAIQuota(userId);
        if (!quota.allowed) {
            return NextResponse.json(
                {
                    error: "You’ve reached today’s AI limit (2 posts per day). You can try again tomorrow or continue writing manually.",
                    code: "AI_DAILY_QUOTA_EXCEEDED"
                },
                { status: 429 }
            );
        }

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

        // Construct canonical prompt
        let prompt = `Role: Elite LinkedIn Ghostwriter
Action: Write a high-engagement LinkedIn post about "${topic}".
Format:
- Start with a compelling hook.
- Use structured points/short paragraphs with whitespace.
- Emojis: 3-5 professional ones.
- Length: Target ~${targetLength} characters.
- End with a strong CTA or question.
- No labels (e.g., "Hook:").`;

        if (style?.includes("Write Like Me") && userWritingSample) {
            prompt += `\n\nStyle Reference: Mimic this voice/structure precisely:\n"${userWritingSample}"`;
        } else if (style) {
            prompt += `\n\nTone: ${style}`;
        }

        if (context) {
            prompt += `\n\nSpecific Context to include:\n"${context}"`;
        }

        const messages = [
            { role: "user", content: prompt }
        ];

        try {
            const content = await generateWithFallback(messages);
            const cleanedContent = content
                .replace(/^(Hook|Headline|Body|CTA|Conclusion|Post|Draft):\s*/gmi, "")
                .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion|Post|Draft)\*\*:\s*/gmi, "")
                .trim();

            return NextResponse.json({ content: cleanedContent });
        } catch (aiError: any) {
            console.error("[GENERATE] AI Fallback failed:", aiError);
            return NextResponse.json(
                { error: getPublicErrorMessage(aiError) },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("API Error in Generate route:", error);
        return NextResponse.json(
            { error: "We ran into an issue while generating your post. Please try again in a moment." },
            { status: 500 }
        );
    }
}
