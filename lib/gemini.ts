import { AI_CORE_CONFIG } from "./ai/config";
import { generateWithFallback } from "./openrouter";

const TONE_GUIDELINES = AI_CORE_CONFIG.TONE_MAPPING;

export interface GeneratePostOptions {
    topic: string;
    style?: string; // "Professional", "Casual", "Write Like Me - <Name>", etc.
    userWritingSample?: string; // Content to mimic
    targetLength?: number; // In characters
    context?: string; // Additional user context
}

/**
 * Standardized LinkedIn post generation using OpenRouter fallback system.
 * Used by both manual generation and Autopilot.
 */
export async function generatePost({ 
    topic, 
    style, 
    userWritingSample, 
    targetLength = 1000, 
    context 
}: GeneratePostOptions) {
    if (!topic) throw new Error("Topic is required for AI generation.");

    // Determine Tone
    let activeTone: string = "professional";
    if (style) {
        const lowerStyle = style.toLowerCase();
        if (lowerStyle.includes("enthusiastic")) activeTone = "Enthusiastic";
        else if (lowerStyle.includes("storytelling")) activeTone = "Storytelling";
        else if (lowerStyle.includes("casual")) activeTone = "Casual";
        else if (lowerStyle.includes("bold")) activeTone = "Bold";
        else if (lowerStyle.includes("write like me")) activeTone = "User's specific personal tone";
        else activeTone = style;
    }
    
    // Resolve tone description if it's a built-in one
    const resolvedToneDescription = activeTone.toLowerCase() in TONE_GUIDELINES 
        ? TONE_GUIDELINES[activeTone.toLowerCase() as keyof typeof TONE_GUIDELINES] 
        : activeTone;

    const targetWords = Math.max(Math.floor(targetLength / 5), 50);

    // Construct canonical prompt using AI Core rules
    let basePrompt = `You are an expert LinkedIn content writer.
Write in the EXACT style of the user.
Tone: ${resolvedToneDescription}
Topic: ${topic}
Context: ${context || "None"}
Target length: STRICTLY around ${targetWords} words. You MUST meet this word count.

Instructions:
- Do NOT be generic.
- Use strong hooks.
- Make writing feel human and opinionated.
- Expand fully on the context provided.
- Do NOT shorten or summarize important points.
- Use storytelling or structured flow when possible.
- Avoid AI-sounding phrases.
- DO NOT use markdown code blocks like \`\`\`text or \`\`\`markdown. Output plain text directly.

Output format:
- Strong hook (1-2 lines)
- Body (clear, engaging, structured)
- Optional punchline or closing insight`;

    if (userWritingSample && style?.includes("Write Like Me")) {
        basePrompt += `\n\nCRITICAL - WRITING STYLE REPLICATION (WRITE LIKE ME):
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
4. Structure your response directly based on the visual rhythm of the sample.

FORMATTING FIDELITY:
- Do NOT use markdown bold (**text**) or italics (*text*) unless the Reference Sample EXPLICITLY uses them.
- Do NOT add stars, bullet points, or visual emphasis symbols unless they appear in the sample.
- If the sample is plain text, your output MUST be plain text.`;
    }

    let currentRetry = 0;
    const maxRetries = 1;
    let finalContent = "";
    let promptExtension = "";

    while (currentRetry <= maxRetries) {
        try {
            console.log(`[AI] Generating post via OpenRouter fallback system for topic: ${topic.substring(0, 30)}... [Attempt ${currentRetry + 1}]`);
            const messages = [
                { role: "user", content: basePrompt + promptExtension }
            ];

            let content = await generateWithFallback(messages);
            
            if (!content) throw new Error("Empty response from AI");

            content = content
                .replace(/^```[a-z]*\n/gi, "")
                .replace(/```$/gi, "")
                .replace(/^(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style|Insight|Lesson|Takeaway):\s*/gmi, "")
                .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style|Insight|Lesson|Takeaway)\*\*:\s*/gmi, "")
                .trim();
                
            // Validate word count length
            const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
            
            if (wordCount < targetWords * 0.7 && currentRetry < maxRetries) {
                console.warn(`[AI] Quality Check Failed: Output too short (${wordCount} words vs target ${targetWords}). Triggering high-enforcement regeneration...`);
                promptExtension = `\n\nCRITICAL ENFORCEMENT: Your previous generation was only ${wordCount} words long. You MUST ensure the length is exactly around ${targetWords} words. Expand thoroughly on the ideas, do not summarize. DO NOT output any conversational text or acknowledge this message, just re-output the post correctly.`;
                currentRetry++;
                continue;
            }
            
            finalContent = content;
            break;

        } catch (error: any) {
            console.error("[AI] Generation Failed:", error);
            throw error; // Let the caller handle it (e.g. with getPublicErrorMessage)
        }
    }
    
    return finalContent;
}


