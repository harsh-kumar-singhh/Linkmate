import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;

    // Explicit runtime validation for GEMINI_API_KEY
    if (!apiKey) {
        console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
        throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.");
    }

    if (process.env.NODE_ENV === "production") {
        console.log("Gemini API Key validation: Present (masked):", apiKey.substring(0, 4) + "...");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Switch to confirmed free-tier stable model (gemini-1.5-flash was 404ing)
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
}

export interface GeneratePostOptions {
    topic: string;
    style?: string; // "Professional", "Casual", "Write Like Me", etc.
    userWritingSample?: string; // Content to mimic
}

export async function generatePost({ topic, style, userWritingSample }: GeneratePostOptions) {
    try {
        if (!topic) throw new Error("Topic is required for AI generation.");

        let prompt = `Write a LinkedIn post about "${topic}".`;

        if (style === "Write Like Me" && userWritingSample) {
            prompt += `\n\nMimic the following writing style:\n"${userWritingSample}"\n`;
        } else if (style) {
            prompt += `\n\nStyle: ${style}`;
        }

        prompt += `\n\nEnsure it has a good hook, engaging body, and a clear call to action. Use appropriate emojis but don't overdo it. Keep it under 3000 characters.`;

        const model = getGeminiModel();

        console.log(`Starting AI generation for topic: "${topic}" using gemini-2.5-flash-lite`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
            throw new Error("AI returned empty response.");
        }

        return text;
    } catch (error: any) {
        console.error("DETAILED AI GENERATION ERROR:", {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name
        });

        const errorMessage = error.message?.includes("API_KEY_INVALID")
            ? "Invalid Gemini API key. Please check your configuration."
            : error.message || "Failed to generate post.";

        throw new Error(`AI Generation Failure: ${errorMessage}`);
    }
}
