import { NextResponse } from "next/server";
import { generatePost } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { topic, style } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
        }

        let userWritingSample = undefined;

        // If style is "Write Like Me", fetch user's stored style
        if (style === "Write Like Me") {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { writingStyle: true }
            });
            if (user?.writingStyle) {
                userWritingSample = user.writingStyle;
            }
        }

        const content = await generatePost({ topic, style, userWritingSample });
        return NextResponse.json({ content });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate post" }, { status: 500 });
    }
}
