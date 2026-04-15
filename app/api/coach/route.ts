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
        const pastPosts = context.rawRecentContent || [];
        const formattedPosts = pastPosts.length > 0 
            ? pastPosts.map((p: string, i: number) => `Post ${i+1}: ${p}`).join("\n\n---\n\n")
            : "No past posts available yet.";

        // 5. System Prompt Construction
        const systemPrompt = `You are an expert LinkedIn growth strategist and content coach for Linkmate.
Your goal is to provide highly personalized, non-generic advice based on the user's content behavior.

User's Past Content Context:
${formattedPosts}

Current Activity Context:
- Scheduled: ${JSON.stringify(context.scheduledPosts)}
- Current Page: ${page}
${draftContent ? `- Current Draft Under Review: "${draftContent}"` : ""}

AI COACH BEHAVIOR RULES:
- BE SPECIFIC: Avoid generic advice like "be consistent" or "share value".
- ANALYZE PATTERNS: Identify the user's common topics, tone, and structure.
- ACTIONABLE NEXT STEPS: Suggest exactly what they should post next.
- REFERENCE DATA: Mention their actual past content when making points.

OUTPUT FORMAT (STRICT):
You must output a JSON object with this structure:
{
  "reply": "...",
  "insights": [{ "type": "trend" | "success" | "warning", "text": "..." }],
  "suggestions": [{ "title": "...", "hook": "...", "why": "..." }],
  "quickActions": ["Action 1", "Action 2"]
}`;

        // 6. Build Conversation History
        const conversationHistory = chatSession.messages
            .reverse() // Put in chronological order
            .map(m => ({
                role: m.role === "coach" ? "assistant" : "user",
                content: typeof m.content === "string" ? m.content : JSON.stringify((m.content as any).reply || m.content)
            }));

        const currentQuery = userQuery || "Give me a quick update and some coach advice.";
        
        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-6), // Last 6 messages for context
            { role: "user", content: currentQuery }
        ];

        // 7. Call OpenRouter with Streaming
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages,
                temperature: 0.6,
                stream: true,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) throw new Error(`OpenRouter API failed`);

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
                    const parsed = JSON.parse(fullAIResponse);
                    await prisma.chatMessage.create({
                        data: {
                            sessionId: chatSession!.id,
                            role: "coach",
                            content: parsed as any
                        }
                    });
                } catch (e) {
                    console.error("Failed to save AI message to DB:", e);
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

