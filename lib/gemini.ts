import { GoogleGenerativeAI } from "@google/generative-ai";

export const MODELS = ["gemini-2.0-flash"]; // Standardize on a stable, fast model

// Global client instance to reuse across requests
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.");
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export function getGeminiModel(modelName: string = "gemini-2.0-flash") {
    return getGenAI().getGenerativeModel({ model: modelName });
}

export interface GeneratePostOptions {
    topic: string;
    style?: string; // "Professional", "Casual", "Write Like Me - <Name>", etc.
    userWritingSample?: string; // Content to mimic
    targetLength?: number; // In characters
    context?: string; // Additional user context
}

export async function generatePost({ topic, style, userWritingSample, targetLength = 1000, context }: GeneratePostOptions) {
    if (!topic) throw new Error("Topic is required for AI generation.");

    // Optimized prompt for speed and clarity
    let prompt = `Role: Elite LinkedIn Ghostwriter
Action: Write a high-engagement LinkedIn post about "${topic}".
Format:
- Start with a compelling hook.
- Use structured points/short paragraphs with whitespace.
- Emojis: 3-5 professional ones.
- Length: Target ~${targetLength} characters.
- End with a strong CTA or question.
- No labels (e.g., "Hook:").`;

    if (style?.includes("Write Like Me") && userWritingSample) {
        prompt += `\n\nStyle Reference: Mimic this voice/structure precisely:\n"${userWritingSample}"`;
    } else if (style) {
        prompt += `\n\nTone: ${style}`;
    }

    if (context) {
        prompt += `\n\nSpecific Context to include:\n"${context}"`;
    }

    try {
        console.log(`[AI] Generating post with gemini-2.0-flash for topic: ${topic.substring(0, 30)}...`);
        const model = getGeminiModel();
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (!text) throw new Error("Empty response from AI");

        return text
            .replace(/^(Hook|Headline|Body|CTA|Conclusion|Post|Draft):\s*/gmi, "")
            .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion|Post|Draft)\*\*:\s*/gmi, "")
            .trim();

    } catch (error: any) {
        console.error("[AI] Generation Failed:", error);
        // User-safe fallback message
        throw new Error("The AI strategist is briefly offline. Please try manually or check back in a moment.");
    }
}
