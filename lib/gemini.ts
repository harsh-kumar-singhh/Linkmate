import { GoogleGenerativeAI } from "@google/generative-ai";

export const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

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

    let prompt = `Write a LinkedIn post about "${topic}".`;

    if (style === "Write Like Me" && userWritingSample) {
        prompt += `\n\nMimic the following writing style:\n"${userWritingSample}"\n`;
    } else if (style) {
        prompt += `\n\nStyle: ${style}`;
    }

    if (context) {
        prompt += `\n\nUser Context/Requirements: "${context}"\nEnsure the post incorporates the specific points or requirements mentioned in this context.`;
    }

    if (targetLength) {
        prompt += `\n\nTarget Length: Approximately ${targetLength} characters.`;
    }

    prompt += `\n\nEnsure it has a good hook, engaging body, and a clear call to action. Use appropriate emojis but don't overdo it. Keep it strictly under 3000 characters.`;

    let lastError: any = null;

    for (const modelName of MODELS) {
        try {
            console.log(`Attempting AI generation with model: ${modelName}`);
            const model = getGeminiModel(modelName);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            if (text) {
                console.log(`AI generation successful with model: ${modelName}`);
                return text;
            }
            throw new Error(`Empty response from model: ${modelName}`);
        } catch (error: any) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;
            // Continue to next model
        }
    }

    console.error("ALL MODELS FAILED. Last error:", {
        message: lastError?.message,
        status: lastError?.status,
    });

    const isNotFoundError = lastError?.message?.includes("404") || lastError?.status === 404;
    const userMessage = isNotFoundError
        ? "AI service is currently updating. Please try again in a moment."
        : "AI Generation is temporarily unavailable. Please try again.";

    throw new Error(userMessage);
}
