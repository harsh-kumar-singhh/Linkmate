import { GoogleGenerativeAI } from "@google/generative-ai";

export const MODELS = ["gemini-2.5-flash"];

export function getGeminiModel(modelName: string) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
}

export interface GeneratePostOptions {
    topic: string;
    style?: string; // "Professional", "Casual", "Write Like Me", etc.
    userWritingSample?: string; // Content to mimic
    targetLength?: number; // In characters
    context?: string; // Additional user context
}

export async function generatePost({ topic, style, userWritingSample, targetLength = 1000, context }: GeneratePostOptions) {
    if (!topic) throw new Error("Topic is required for AI generation.");

    let prompt = `You are a professional ghostwriter for LinkedIn. Write a high-quality, viral-style LinkedIn post about "${topic}".

STRICT FORMATTING RULES:
1. Return ONLY the raw post text.
2. DO NOT include ANY specific labels like "Hook:", "Body:", "CTA:", "Headline:", etc.
3. DO NOT wrap the content in quotes.
4. The output must be ready-to-post immediately.

Content Rules:
- Hook: Start with a punchy, attention-grabbing first line.
- Structure: Use short paragraphs and whitespace for readability.
- Emoji: Use appropriate emojis but keep it professional (maximum 3-5).
- Length: Approximately ${targetLength} characters.
- Ending: End with a clear, engaging question or call to action.`;

    if (style === "Write Like Me" && userWritingSample) {
        prompt += `\n\nSTYLE INSTRUCTION: Mimic the following user writing style strictly:\n"${userWritingSample}"\n`;
    } else if (style) {
        prompt += `\n\nSTYLE INSTRUCTION: Write in a ${style} tone.`;
    }

    if (context) {
        prompt += `\n\nADDITIONAL CONTEXT: "${context}"\n(Incorporate these specific points naturally.)`;
    }

    try {
        console.log(`Starting AI generation with gemini-2.5-flash`);
        const model = getGeminiModel("gemini-2.5-flash");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
            throw new Error("Empty response from AI");
        }

        // Cleanup any accidental labels if the AI hallucinated them
        const cleanText = text
            .replace(/^(Hook|Headline|Body|CTA|Conclusion):\s*/gmi, "")
            .replace(/\*\*(Hook|Headline|Body|CTA|Conclusion)\*\*:\s*/gmi, "")
            .trim();

        return cleanText;

    } catch (error: any) {
        console.error("AI Generation Failed:", error);

        // Return clear error message to user
        throw new Error(error.message || "AI Generation failed. Please try again.");
    }
}
