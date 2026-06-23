import { AI_CORE_CONFIG } from "./ai/config";
import { generateWithFallback } from "./openrouter";
import { StyleMemory, DEFAULT_STYLE_MEMORY } from "./ai/default-style-memory";

const TONE_GUIDELINES = AI_CORE_CONFIG.TONE_MAPPING;

export interface GeneratePostOptions {
    topic: string;
    style?: string; // "Professional", "Casual", "Write Like Me - <Name>", etc.
    userWritingSample?: string; // Content to mimic (user custom style or history)
    styleMemory?: StyleMemory; // Default structured memory
    targetLength?: number; // In characters
    context?: string; // Additional user context
    enforceLength?: boolean;
    maxTokens?: number;
    timeoutMs?: number;
}

/**
 * Standardized LinkedIn post generation using OpenRouter fallback system.
 * Used by both manual generation and Autopilot.
 */
export async function generatePost({ 
    topic, 
    style, 
    userWritingSample, 
    styleMemory,
    targetLength = 1000, 
    context,
    enforceLength = true,
    maxTokens,
    timeoutMs
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
    
    // Fallback to default banned phrases if memory is provided or using global defaults
    const bannedPhrases = styleMemory?.bannedPhrases || DEFAULT_STYLE_MEMORY.bannedPhrases;

    // Construct canonical prompt using AI Core rules
    let basePrompt = `You are an expert LinkedIn content writer.
Tone: ${resolvedToneDescription} (Use this tone as a modifier for the voice, but do NOT let it make the post generic)
Topic: ${topic}
Context: ${context || "None"}
Target length: STRICTLY around ${targetWords} words. You MUST meet this word count.

CRITICAL HOOK GENERATION INSTRUCTIONS:
- The hook MUST start directly with a strong action verb (command-verb framework).
- Examples: "Stop doing this.", "Build before you're ready.", "Learn this skill.", "Ignore the hype.", "Start here.", "Think bigger.", "Delete this habit.", "Focus on this instead.", "Ship faster.", "Question everything."
- Hook length MUST generally stay under 8 words. Prioritize curiosity and urgency. Maintain variety by rotating verbs and structures.
- ABSOLUTELY NO setup phrases before the hook (e.g., Do NOT use "You should", "You need to", "I think", "Here's why", "Let me explain", "In my opinion").

AI DETECTION REDUCTION & WRITING STYLE:
- Do NOT use markdown formatting (NO *, **, #, ##, ###, _, __).
- Do NOT use excessive emojis or excessive bullet lists.
- Short paragraphs only (1-3 sentences max).
- Natural sentence flow and conversational tone.
- Human observations over generic advice. Specific examples whenever possible.
- Avoid motivational clichés. Avoid repetitive sentence structures.
- Avoid sounding like ChatGPT. Output should resemble how real successful creators naturally write LinkedIn posts.

CRITICAL QUALITY INSTRUCTIONS:
- Generated posts MUST be specific rather than generic.
- DO NOT use cliché AI phrases like: ${bannedPhrases.slice(0, 5).map(p => `"${p}"`).join(", ")}.
- DO NOT use markdown code blocks like \`\`\`text or \`\`\`markdown. Output plain text directly.

Output format:
- Strong hook (1-2 lines, command-verb focused)
- Body (clear, engaging, structured, conversational)
- Optional punchline or closing insight`;

    if (userWritingSample && style?.includes("Write Like Me")) {
        // High fidelity user style cloning
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

    } else if (userWritingSample) {
        // Historical posts style reference (no explicit Write Like Me style tag but history is provided)
        basePrompt += `\n\nCRITICAL - WRITING STYLE REPLICATION:
Extract and mimic the sentence length patterns, formatting style, hook structure, and storytelling style from the following historical reference posts:

REFERENCE POSTS:
"""
${userWritingSample}
"""
`;
    } else if (styleMemory) {
        // Default structured style memory
        basePrompt += `\n\nCRITICAL - WRITING STYLE REPLICATION:
You must learn and apply the patterns, structure, and writing style from the provided memory.
Do not copy the examples verbatim. Extract their sentence length patterns, formatting style, hook structure, argument style, and CTA style.

WRITING PRINCIPLES:
${styleMemory.writingPrinciples.map(p => `- ${p}`).join('\n')}

HOOK STRUCTURES:
${styleMemory.hookStructures.map(p => `- ${p}`).join('\n')}

FORMATTING PATTERNS:
${styleMemory.formattingPatterns.map(p => `- ${p}`).join('\n')}

REFERENCE POSTS (Mimic this structure and specificity):
${styleMemory.referencePosts.map(p => `\n--- EXAMPLE ---\n${p.content}`).join('\n')}
`;
    }

    let currentRetry = 0;
    const maxRetries = enforceLength ? 2 : 1; // Allow an extra retry for phrase detection
    let finalContent = "";
    let promptExtension = "";

    while (currentRetry <= maxRetries) {
        try {
            console.log(`[AI] Generating post via OpenRouter fallback system for topic: ${topic.substring(0, 30)}... [Attempt ${currentRetry + 1}]`);
            const messages = [
                { role: "user", content: basePrompt + promptExtension }
            ];

            let content = await generateWithFallback(messages, {
                max_tokens: maxTokens,
                timeoutMs,
                task: targetLength > 1200 ? "linkedin_long_form" : "linkedin_post",
            });
            
            if (!content) throw new Error("Empty response from AI");

            content = content
                .replace(/^```[a-z]*\n/gi, "")
                .replace(/```$/gi, "")
                .replace(/^(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style|Insight|Lesson|Takeaway):\s*/gmi, "")
                .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion|Post|Draft|Tone|Style|Insight|Lesson|Takeaway)\*\*:\s*/gmi, "")
                // Strip markdown formatting as a fallback
                .replace(/(\*\*|__|\*|_)/g, "")
                .replace(/^#+\s+/gm, "")
                .trim();
                
            // QUALITY CHECK: Banned Phrases & Formatting
            const lowerContent = content.toLowerCase();
            const detectedPhrases = bannedPhrases.filter(phrase => lowerContent.includes(phrase.toLowerCase()));
            const hasSetupPhrase = /^(you should|you need to|i think|here's why|let me explain|in my opinion)/i.test(content.trim());
            
            if ((detectedPhrases.length > 0 || hasSetupPhrase) && currentRetry < maxRetries) {
                let issues = [];
                if (detectedPhrases.length > 0) issues.push(`cliché phrases (${detectedPhrases.join(', ')})`);
                if (hasSetupPhrase) issues.push(`a forbidden setup phrase at the beginning of the hook`);
                
                console.warn(`[AI] Quality Check Failed: Detected ${issues.join(', ')}. Triggering regeneration...`);
                promptExtension = `\n\nCRITICAL ENFORCEMENT: Your previous generation contained ${issues.join(' and ')}. You MUST rewrite the post to be completely free of these issues. Remember: Start directly with a command verb, NO setup phrases, and NO markdown formatting.`;
                currentRetry++;
                continue;
            }

            // QUALITY CHECK: Word count length
            const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
            
            if (enforceLength && wordCount < targetWords * 0.7 && currentRetry < maxRetries) {
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

