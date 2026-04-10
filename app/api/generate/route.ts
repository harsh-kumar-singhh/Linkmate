 export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { generateWithFallback, getPublicErrorMessage } from "@/lib/openrouter";
import { checkAndIncrementAIQuota } from "@/lib/usage";
import { AIUsageType } from "@prisma/client";
import { AI_CORE_CONFIG } from "@/lib/ai/config";

const TONE_GUIDELINES = AI_CORE_CONFIG.TONE_MAPPING;

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.warn("[GENERATE] No authenticated session found");
            return NextResponse.json(
                { error: "We couldn’t verify your session. Please refresh the page once." },
                { status: 401 }
            );
        }

        const user = await resolveUser(session);
        if (!user) {
            return NextResponse.json(
                { error: "We couldn’t verify your session. Please refresh the page once." },
                { status: 401 }
            );
        }

        const userId = user.id;

        const { topic, style, targetLength = 1000, context } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        // --- ENFORCE DAILY QUOTA (POST GENERATION) ---
        const plan = (session.user.plan || "FREE").toUpperCase();
        const quota = await checkAndIncrementAIQuota(userId, AIUsageType.AI_POST_GENERATION, plan);
        if (!quota.allowed) {
            return NextResponse.json(
                {
                    error: AI_CORE_CONFIG.ERROR_MESSAGES.quota_exceeded_post,
                    code: "AI_DAILY_QUOTA_EXCEEDED"
                },
                { status: 429 }
            );
        }

        // Fetch User Data for Write Like Me styles
        let userWritingSample = undefined;

        if (style && style.includes("Write Like Me")) {
            const userData = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    writingStyles: true,
                    writingStyle: true,
                    customStyles: true,
                    aboutYou: true
                }
            } as any);

            if (userData) {
                if ((userData as any).aboutYou) {
                   // Append global context to the generation context
                   // We'll pass it to generatePost below
                }
                let styles = (userData as any).writingStyles || [];
                // Bridge logic: combine legacy and new styles if needed
                if (styles.length === 0) {
                    if ((userData as any).writingStyle) styles.push({ name: "Legacy (Main)", sample: (userData as any).writingStyle });
                    if ((userData as any).customStyles) {
                        (userData as any).customStyles.forEach((s: string, i: number) => {
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

        try {
            const { generatePost } = require("@/lib/gemini");
            
            // PRE-FILL: Prepend global "About You" context if available
            const globalContext = (user as any).aboutYou ? `USER BACKGROUND: ${(user as any).aboutYou}\n\n` : "";
            const midContext = context ? `ADDITIONAL CONTEXT: ${context}` : "";
            const finalContext = `${globalContext}${midContext}`.trim();

            const cleanedContent = await generatePost({
                topic,
                style,
                userWritingSample,
                targetLength,
                context: finalContext
            });

            return NextResponse.json({ content: cleanedContent });
        } catch (aiError: any) {
            console.error("[GENERATE] AI Generation failed:", aiError);
            return NextResponse.json(
                { error: getPublicErrorMessage(aiError) },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("API Error in Generate route:", error);
        return NextResponse.json(
            { error: "Something went wrong on our end. Please try again shortly." },
            { status: 500 }
        );
    }
}
