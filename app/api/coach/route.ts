export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUser } from "@/lib/auth/user";
import { getCoachContext } from "@/lib/coach-context";
import { AI_CORE_CONFIG } from "@/lib/ai/config";
import { generateWithFallback, getCoachErrorResponse, AIError } from "@/lib/openrouter";
import { checkAndIncrementAIQuota } from "@/lib/usage";
import { AIUsageType } from "@prisma/client";

export async function POST(req: Request) {
    try {
        const session = await auth();

        const user = await resolveUser(session);
        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    errorCode: AI_CORE_CONFIG.ERROR_CATEGORIES.AUTH_MISSING,
                    message: "Your session expired. Please refresh the page."
                },
                { status: 401 }
            );
        }

        const userId = user.id;

        const { page, draftContent, userQuery } = await req.json();

        // --- ENFORCE DAILY QUOTA (COACH) ---
        // Short-circuit: Check quota BEFORE calling AI or doing heavy DB work
        const quota = await checkAndIncrementAIQuota(userId, AIUsageType.AI_CONTENT_COACH);
        if (!quota.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    errorCode: AI_CORE_CONFIG.ERROR_CATEGORIES.QUOTA_EXCEEDED,
                    message: AI_CORE_CONFIG.ERROR_MESSAGES.quota_exceeded_coach
                },
                { status: 429 }
            );
        }

        const context = await getCoachContext(userId);

        let systemPrompt = `Role: LinkMate AI Content Coach (Elite LinkedIn Strategist)
Purpose: ${AI_CORE_CONFIG.AI_COACH.purpose}

GLOBAL RULES:
${AI_CORE_CONFIG.GLOBAL_RULES.hard_constraints.map(c => `- ${c}`).join('\n')}
${AI_CORE_CONFIG.GLOBAL_RULES.prohibited_behavior.map(b => `- ${b}`).join('\n')}

Response Style:
${AI_CORE_CONFIG.AI_COACH.response_style.map(s => `- ${s}`).join('\n')}

User Context:
- Recent Posts & Performance: ${JSON.stringify(context.recentPerformance)}
- Scheduled Posts: ${JSON.stringify(context.scheduledPosts)}
- Current Page: ${page}
${draftContent ? `- Current Draft Content: "${draftContent}"` : ""}

Coach Guidelines:
1. Provide specific insights based ONLY on the provided real performance data.
2. If analysis data for a post is missing (0 views/likes), do not invent performance.
3. If no data is available at all, explicitly state: "I don't have enough performance data yet to give specific insights."
4. Reference real numbers (views, likes, engagement rates) when explaining "why" a post worked.
5. Avoid generic advice like "be consistent" unless it is directly supported by a visible pattern in the user's data.
6. If analyzing a draft, focus on the "Hook" (first 2 lines), tone, and clarity.

Response Format (JSON):
{
  "message": "Your conversational response here",
  "insights": [
    { "type": "trend|warning|success", "text": "Short insight text" }
  ],
  "suggestions": [
    { "title": "Post Idea", "hook": "Suggested hook...", "why": "Explanation..." }
  ],
  "quickActions": ["String of a question the user might ask next"]
}`;

        let userPrompt = userQuery || "Give me a quick update and some advice.";

        // Add specific instruction based on page if no query
        if (!userQuery) {
            if (page === "/posts/new" && draftContent) {
                userPrompt = "Analyze my current draft and suggest improvements.";
            } else if (page === "/stats") {
                userPrompt = "Explain my recent performance trends.";
            } else {
                userPrompt = "What should I focus on today?";
            }
        }

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        try {
            console.log(`[AI_COACH] Generating advice with OpenRouter fallback system`);
            const text = await generateWithFallback(messages, {
                temperature: 0.7,
                response_format: { type: 'json_object' }
            });

            if (text) {
                // Try to parse the AI output as JSON first
                try {
                    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsedData = JSON.parse(cleanedText);
                    return NextResponse.json({
                        success: true,
                        reply: parsedData.message || "I've analyzed your content.",
                        data: {
                            insights: parsedData.insights || [],
                            suggestions: parsedData.suggestions || [],
                            quickActions: parsedData.quickActions || []
                        }
                    });
                } catch (parseError) {
                    console.warn(`[AI_COACH] AI returned non-JSON text, wrapping in reply:`, text.substring(0, 100));
                    // Fallback: If AI returns raw text, treat it as a reply string
                    return NextResponse.json({
                        success: true,
                        reply: text,
                        data: { insights: [], suggestions: [], quickActions: [] }
                    });
                }
            }
        } catch (aiError: any) {
            console.error(`[AI_COACH] AI Fallback failed:`, aiError);
            const { error: msg, code } = getCoachErrorResponse(aiError);
            let status = 503;
            if (code === AI_CORE_CONFIG.ERROR_CATEGORIES.AUTH_MISSING) status = 401;
            else if (code === AI_CORE_CONFIG.ERROR_CATEGORIES.QUOTA_EXCEEDED) status = 429;
            else if (code === AI_CORE_CONFIG.ERROR_CATEGORIES.UNKNOWN_INTERNAL) status = 500;

            return NextResponse.json({
                success: false,
                errorCode: code,
                message: msg
            }, { status });
        }

        throw new AIError("Empty response from AI Coach", "MODEL_FAILURE");

    } catch (error: any) {
        console.error("[AI_COACH] API Error:", error);

        // --- SPECIFIC DATABASE ERROR HANDLING ---
        if (error.code?.startsWith('P') || error.message?.includes('Prisma')) {
            return NextResponse.json({
                success: false,
                errorCode: AI_CORE_CONFIG.ERROR_CATEGORIES.MODEL_FAILURE,
                message: "The assistant is temporarily unavailable. Please try again in a moment."
            }, { status: 503 });
        }

        if (error instanceof AIError) {
            const { error: msg, code } = getCoachErrorResponse(error);
            return NextResponse.json({
                success: false,
                errorCode: code,
                message: msg
            }, { status: 500 });
        }

        return NextResponse.json({
            success: false,
            errorCode: AI_CORE_CONFIG.ERROR_CATEGORIES.UNKNOWN_INTERNAL,
            message: AI_CORE_CONFIG.ERROR_MESSAGES.unknown_internal
        }, { status: 500 });
    }
}
