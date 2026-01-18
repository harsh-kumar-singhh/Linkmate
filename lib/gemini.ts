import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = ["gemini-2.0-flash-lite-preview-02-05", "gemini-2.5-flash-lite", "gemini-2.0-flash-exp"];

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
}

export async function generatePost({ topic, style, userWritingSample }: GeneratePostOptions) {
    if (!topic) throw new Error("Topic is required for AI generation.");

    let prompt = `Write a LinkedIn post about "${topic}".`;

    if (style === "Write Like Me" && userWritingSample) {
        prompt += `\n\nMimic the following writing style:\n"${userWritingSample}"\n`;
    } else if (style) {
        prompt += `\n\nStyle: ${style}`;
    }

    prompt += `\n\nEnsure it has a good hook, engaging body, and a clear call to action. Use appropriate emojis but don't overdo it. Keep it under 3000 characters.`;

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
        stack: lastError?.stack,
    });

    throw new Error(`AI Generation Failure: ${lastError?.message || "All models failed"}`);
}
