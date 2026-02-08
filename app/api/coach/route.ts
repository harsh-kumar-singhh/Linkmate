export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUser } from "@/lib/auth/user";
import { getCoachContext } from "@/lib/coach-context";
import { generateWithFallback, getPublicErrorMessage } from "@/lib/openrouter";
import { checkAndIncrementAIQuota } from "@/lib/usage";
import { getPrisma } from "@/lib/prisma";
import { AIUsageType } from "@prisma/client";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.warn("[COACH] No authenticated session found");
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

        const { page, draftContent, userQuery } = await req.json();

        // --- ENFORCE DAILY QUOTA (COACH) ---
        const quota = await checkAndIncrementAIQuota(userId, AIUsageType.AI_CONTENT_COACH);
        if (!quota.allowed) {
            return NextResponse.json(
                {
                    error: "You’ve reached today’s AI Coach limit (2 messages). You can continue tomorrow.",
                    code: "AI_COACH_QUOTA_EXCEEDED"
                },
                { status: 429 }
            );
        }

        const context = await getCoachContext(userId);

        let systemPrompt = `You are the LinkMate AI Content Coach, an elite LinkedIn strategist. 
Your goal is to provide concise, high-value, and personalized advice to help the user grow their LinkedIn presence.

User Context:
- Recent Posts & Performance: ${JSON.stringify(context.recentPerformance)}
- Scheduled Posts: ${JSON.stringify(context.scheduledPosts)}
- Current Page: ${page}
${draftContent ? `- Current Draft Content: "${draftContent}"` : ""}

Guidelines:
1. Be concise. Use bullet points for readability.
2. Provide specific insights based ONLY on the provided real performance data.
3. If analysis data for a post is missing (0 views/likes), do not invent performance.
4. If no data is available at all, explicitly state: "I don't have enough performance data yet to give specific insights."
5. Reference real numbers (views, likes, engagement rates) when explaining "why" a post worked.
6. Avoid generic advice like "be consistent" unless it is directly supported by a visible pattern in the user's data.
7. If analyzing a draft, focus on the "Hook" (first 2 lines), tone, and clarity.
8. Always sound encouraging but professional and data-driven.

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
            console.log(`[COACH] Generating advice with OpenRouter fallback system`);
            const text = await generateWithFallback(messages, {
                temperature: 0.7,
                response_format: { type: 'json_object' }
            });

            if (text) {
                // Clean up potential markdown JSON block
                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                return NextResponse.json(JSON.parse(cleanedText));
            }
        } catch (aiError: any) {
            console.error(`[COACH] AI Fallback failed:`, aiError);
            return NextResponse.json({
                error: getPublicErrorMessage(aiError)
            }, { status: 500 });
        }

        throw new Error("Empty response from AI Coach");

    } catch (error) {
        console.error("Coach API Error:", error);
        return NextResponse.json({
            error: "Something went wrong on our end. Please try again shortly."
        }, { status: 500 });
    }
}
