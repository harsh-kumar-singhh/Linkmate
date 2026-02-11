export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/prisma";
import { generateWithFallback, getPublicErrorMessage } from "@/lib/openrouter";
import { checkAndIncrementAIQuota } from "@/lib/usage";
import { AIUsageType } from "@prisma/client";
import { AI_CORE_CONFIG } from "@/lib/ai/config";

const TONE_GUIDELINES = AI_CORE_CONFIG.TONE_MAPPING;

export async function POST(req: Request) {
    const prisma = getPrisma();
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
        const quota = await checkAndIncrementAIQuota(userId, AIUsageType.AI_POST_GENERATION);
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

        // Determine Tone
        let activeTone: keyof typeof TONE_GUIDELINES = "professional";
        if (style) {
            const lowerStyle = style.toLowerCase();
            if (lowerStyle.includes("enthusiastic")) activeTone = "enthusiastic";
            else if (lowerStyle.includes("storytelling")) activeTone = "storytelling";
            else if (lowerStyle.includes("casual")) activeTone = "casual";
            else if (lowerStyle.includes("bold")) activeTone = "bold";
        }

        if (style && style.includes("Write Like Me")) {
            const userData = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    writingStyles: true,
                    writingStyle: true,
                    customStyles: true
                }
            } as any);

            if (userData) {
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

        // Strict Word Limit Logic: Aim for midpoint
        const wordMidpoint = Math.floor(targetLength / 6); // Approximation: 6 chars per word

        // Construct canonical prompt using AI Core rules
        let prompt = `Role: Elite LinkedIn Ghostwriter
Action: Write a high-engagement LinkedIn post about "${topic}".
Goal: Aim for a length of ${targetLength} characters.

GLOBAL RULES:
${AI_CORE_CONFIG.GLOBAL_RULES.hard_constraints.map(c => `- ${c}`).join('\n')}
${AI_CORE_CONFIG.GLOBAL_RULES.prohibited_behavior.map(b => `- ${b}`).join('\n')}

Tone Enforcement (${activeTone}):
${TONE_GUIDELINES[activeTone]}

Constraint Rules:
- Start with a compelling hook.
- Use structured points/short paragraphs with whitespace.
- Emojis: Strictly 3-5 professional ones.
- End with a strong CTA or question.
- No labels (e.g., "Hook:", "Tone:").

HARD CONSTRAINT - LENGTH:
- Your response MUST be under ${targetLength} characters.
- This is a CRITICAL LIMIT. If you exceed it, the response is invalid.
- Prune unnecessary words to fit.`;

        if (userWritingSample) {
            // override global rules for Write Like Me to prevent conflict
            prompt += `\n\nCRITICAL - WRITING STYLE REPLICATION (WRITE LIKE ME):
${AI_CORE_CONFIG.WRITE_LIKE_ME.instruction}
${AI_CORE_CONFIG.WRITE_LIKE_ME.rules.map(r => `- ${r}`).join('\n')}

REFERENCE SAMPLE (Everything below is the style truth):
"""
${userWritingSample}
"""

Usage Instructions:
1. Ignore standard grammar rules if the sample ignores them.
2. If the sample uses lowercase for line starts, YOU MUST TOO.
3. If the sample has no emojis, YOU MUST HAVE NONE.
4. Structure your response directly based on the visual rhythm of the sample.`;
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
                .replace(/^(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style):\s*/gmi, "")
                .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style)\*\*:\s*/gmi, "")
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
            { error: "Something went wrong on our end. Please try again shortly." },
            { status: 500 }
        );
    }
}
