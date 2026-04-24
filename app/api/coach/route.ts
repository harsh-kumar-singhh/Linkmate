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
import { triggerAICoachFollowUp, triggerUpgradePrompt } from "@/lib/notifications";

import { prisma } from "@/lib/prisma";

// --- GET: Fetch active session and messages ---
export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = await resolveUser(session);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        // Find latest active session
        let chatSession = await prisma.chatSession.findFirst({
            where: { userId: user.id, active: true },
            include: { messages: { orderBy: { createdAt: "asc" } } }
        });

        // If no session, create one
        if (!chatSession) {
            chatSession = await prisma.chatSession.create({
                data: { userId: user.id, active: true },
                include: { messages: true }
            });
        }

        return NextResponse.json({
            success: true,
            sessionId: chatSession.id,
            messages: chatSession.messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        });
    } catch (error) {
        console.error("[COACH_GET] Error:", error);
        return NextResponse.json({ success: false, message: "Failed to load chat" }, { status: 500 });
    }
}

// --- DELETE: "New Chat" (Deactivate current session) ---
export async function DELETE(req: Request) {
    try {
        const session = await auth();
        const user = await resolveUser(session);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        await prisma.chatSession.updateMany({
            where: { userId: user.id, active: true },
            data: { active: false }
        });

        return NextResponse.json({ success: true, message: "New session started" });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to reset chat" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        const user = await resolveUser(session);
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Your session expired. Please refresh the page." },
                { status: 401 }
            );
        }

        const userId = user.id;
        const { page, draftContent, userQuery, sessionId: providedSessionId } = await req.json();

        // 1. Quota Check (Daily Message Limit for Coach)
        const plan = user.plan || "free";
        const quota = await checkAndIncrementAIQuota(userId, AIUsageType.AI_CONTENT_COACH, plan);
        if (!quota.allowed) {
            // Trigger upgrade notification in background
            triggerUpgradePrompt(userId, "AI Coach").catch(e => 
                console.error("[COACH] Notification failed:", e)
            );

            return NextResponse.json(
                {
                    success: false,
                    errorCode: AI_CORE_CONFIG.ERROR_CATEGORIES.QUOTA_EXCEEDED,
                    message: "You've reached your daily limit for the AI Coach. Upgrade to Pro for unlimited advice!"
                },
                { status: 429 }
            );
        }

        // 2. Session Management
        let chatSession;
        if (providedSessionId) {
            chatSession = await prisma.chatSession.findUnique({
                where: { id: providedSessionId },
                include: { messages: { orderBy: { createdAt: "desc" }, take: 10 } }
            });
        }

        if (!chatSession) {
            chatSession = await prisma.chatSession.findFirst({
                where: { userId: userId, active: true },
                include: { messages: { orderBy: { createdAt: "desc" }, take: 10 } }
            });
        }

        if (!chatSession) {
            chatSession = await prisma.chatSession.create({
                data: { userId: userId, active: true },
                include: { messages: true }
            });
        }

        // 3. Save User Message
        if (userQuery) {
            await prisma.chatMessage.create({
                data: {
                    sessionId: chatSession.id,
                    role: "user",
                    content: userQuery as any
                }
            });
        }

        // 4. Context Retrieval (Personalized)
        const context = await getCoachContext(userId) as any;
        const pastPosts = (context.rawRecentContent || []).slice(0, 5);
        const formattedPosts = pastPosts.length > 0 
            ? pastPosts.map((p: string, i: number) => `Post ${i+1}: ${p}`).join("\n\n---\n\n")
            : "No past posts available yet.";

        // 5. System Prompt Construction
        const systemPrompt = `You are an expert LinkedIn growth strategist and content coach for Linkmate.
Your goal is to provide highly personalized, sharp, and non-generic advice based on the user's content behavior and scheduled growth.

User's Past Content Context:
${formattedPosts}

Current Activity Context:
- Scheduled Posts: ${JSON.stringify(context.scheduledPosts)}
- Current Page: ${page}
${draftContent ? `- Current Draft Under Review: "${draftContent}"` : ""}

STRATEGIC BRIEFING MODE:
If the user's query is "Provide a strategic update...", you are in BRIEFING MODE. 
1. Analyze their upcoming schedule vs past performance.
2. If they have nothing scheduled, be encouraging but firm about the need for consistency.
3. If they have a draft, focus on optimizing it.
4. Always start with a warm but professional "Strategist's Update".

AI COACH ANALYTICS RULES:
1. Analyze the user's TONE (e.g., bold, analytical, storytelling, humble).
2. Identify their TOPICS (e.g., SaaS, wellness, engineering).
3. Detect their WRITING STYLE (e.g., short punchy lines vs dense paragraphs).
4. Inject this profile into your response: "Since you usually write in a [TONE] style about [TOPIC], you should..."

AI COACH OUTPUT RULES:
- NO RAW MARKDOWN in "reply" or "structuredReply": Do not use symbols like **, ##, or bullet points. Use plain text and standard spacing.
- SHARP TONE: Be direct and personalized. No generic "Share value" advice.
- STRUCTURED ADVICE: Every response must contain a clear Insight, a Strategy, and an Action.
- JSON ONLY: You must respond ONLY with a raw JSON object. Do NOT wrap it in markdown code blocks. No backticks allowed.
- START WITH '{': Your entire response should start with { and end with }. Do not say "Sure" or "Here is the JSON". Just start with {.

OUTPUT FORMAT (STRICT):
You must output a JSON object with this structure:
{
  "reply": "A brief, punchy intro message to the user.",
  "structuredReply": {
    "insight": "A sharp observation about their current data or draft.",
    "strategy": "The high-level logic they should follow.",
    "action": "A single, clear next step."
  },
  "insights": [{ "type": "trend" | "success" | "warning", "text": "Short data-driven point" }],
  "suggestions": [{ "title": "New Post Idea", "hook": "The actual hook text", "why": "The logic" }],
  "quickActions": ["Next question 1", "Next question 2"]
}`;

        // 6. Build Conversation History
        const conversationHistory = chatSession.messages
            .reverse() // Put in chronological order
            .map((m: any) => ({
                role: m.role === "coach" ? "assistant" : "user",
                content: typeof m.content === "string" ? m.content : JSON.stringify((m.content as any).reply || m.content)
            }));

        const currentQuery = userQuery || "Provide a strategic update based on my recent activity and upcoming schedule.";
        
        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-6), // Last 6 messages for context
            { role: "user", content: currentQuery }
        ];

        // 7. Call OpenRouter with Streaming
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            console.error("[AI_COACH] Error: OPENROUTER_API_KEY is not defined");
            throw new Error("AI service configuration missing");
        }
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://linkmate.io", // Required by some models in OpenRouter
                "X-Title": "Linkmate AI Coach",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages,
                temperature: 0.6,
                stream: true
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[AI_COACH] OpenRouter Error:", errorData);
            throw new Error(`OpenRouter API failed: ${JSON.stringify(errorData)}`);
        }

        // 8. Stream the response and Save to DB at the end
        let fullAIResponse = "";
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                
                if (!reader) return controller.close();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n").filter(line => line.trim() !== "");

                    for (const line of lines) {
                        if (line.includes("[DONE]")) continue;
                        if (line.startsWith("data: ")) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const content = data.choices?.[0]?.delta?.content || "";
                                if (content) {
                                    fullAIResponse += content;
                                    controller.enqueue(new TextEncoder().encode(content));
                                }
                            } catch (e) {}
                        }
                    }
                }

                // SAVE AI MESSAGE TO DB
                try {
                    // Extract valid JSON from the response (handles potential markdown wrappers or intro text)
                    const firstBrace = fullAIResponse.indexOf('{');
                    const lastBrace = fullAIResponse.lastIndexOf('}');
                    
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        const cleanJson = fullAIResponse.substring(firstBrace, lastBrace + 1);
                        const parsed = JSON.parse(cleanJson);
                        
                        await prisma.chatMessage.create({
                            data: {
                                sessionId: chatSession!.id,
                                role: "coach",
                                content: parsed as any
                            }
                        });

                        // Trigger follow-up notification if it's a briefing or significant update
                        if (parsed.reply) {
                            triggerAICoachFollowUp(userId, parsed.reply).catch(e => 
                                console.error("[COACH] Notification failed:", e)
                            );
                        }
                    }
                } catch (e) {
                    console.error("Failed to save AI message to DB:", e, fullAIResponse);
                }

                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error: any) {
        console.error("[AI_COACH] Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

