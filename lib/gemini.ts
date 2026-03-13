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
    let activeTone: keyof typeof TONE_GUIDELINES = "professional";
    if (style) {
        const lowerStyle = style.toLowerCase();
        if (lowerStyle.includes("enthusiastic")) activeTone = "enthusiastic";
        else if (lowerStyle.includes("storytelling")) activeTone = "storytelling";
        else if (lowerStyle.includes("casual")) activeTone = "casual";
        else if (lowerStyle.includes("bold")) activeTone = "bold";
    }

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

    if (userWritingSample && style?.includes("Write Like Me")) {
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
4. Structure your response directly based on the visual rhythm of the sample.

FORMATTING FIDELITY:
- Do NOT use markdown bold (**text**) or italics (*text*) unless the Reference Sample EXPLICITLY uses them.
- Do NOT add stars, bullet points, or visual emphasis symbols unless they appear in the sample.
- If the sample is plain text, your output MUST be plain text.`;
    }

    if (context) {
        prompt += `\n\nSpecific Context to include:\n"${context}"`;
    }

    const messages = [
        { role: "user", content: prompt }
    ];

    try {
        console.log(`[AI] Generating post via OpenRouter fallback system for topic: ${topic.substring(0, 30)}...`);
        const content = await generateWithFallback(messages);
        
        if (!content) throw new Error("Empty response from AI");

        return content
            .replace(/^(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style|Insight|Lesson|Takeaway):\s*/gmi, "")
            .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style|Insight|Lesson|Takeaway)\*\*:\s*/gmi, "")
            .trim();

    } catch (error: any) {
        console.error("[AI] Generation Failed:", error);
        throw error; // Let the caller handle it (e.g. with getPublicErrorMessage)
    }
}


