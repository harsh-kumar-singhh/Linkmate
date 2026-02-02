export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCoachContext } from "@/lib/coach-context";
import { getGeminiModel, MODELS } from "@/lib/gemini";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { page, draftContent, userQuery } = await req.json();
        const context = await getCoachContext(session.user.id);

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

        try {
            console.log(`[COACH] Generating advice with gemini-1.5-flash`);
            const model = getGeminiModel("gemini-1.5-flash");
            const result = await model.generateContent([systemPrompt, userPrompt]);
            const response = await result.response;
            const text = response.text();

            if (text) {
                // Clean up potential markdown JSON block
                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
                return NextResponse.json(JSON.parse(cleanedText));
            }
        } catch (error: any) {
            console.error(`[COACH] Generation failed:`, error);
            throw new Error(error.message || "AI Coach Failed");
        }

        throw new Error("Empty response from AI Coach");

    } catch (error) {
        console.error("Coach API Error:", error);
        return NextResponse.json({
            error: "Failed to get coach advice",
            message: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
