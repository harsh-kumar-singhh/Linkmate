import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export interface GeneratePostOptions {
    topic: string;
    style?: string; // "Professional", "Casual", "Write Like Me", etc.
    userWritingSample?: string; // Content to mimic
}

export async function generatePost({ topic, style, userWritingSample }: GeneratePostOptions) {
    let prompt = `Write a LinkedIn post about "${topic}".`;

    if (style === "Write Like Me" && userWritingSample) {
        prompt += `\n\nMimic the following writing style:\n"${userWritingSample}"\n`;
    } else if (style) {
        prompt += `\n\nStyle: ${style}`;
    }

    prompt += `\n\nEnsure it has a good hook, engaging body, and a clear call to action. Use appropriate emojis but don't overdo it. Keep it under 3000 characters.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}
