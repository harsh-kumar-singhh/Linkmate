export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generatePost } from "@/lib/gemini";

export async function GET(req: Request) {
    try {
        const tests = [
            { topic: "Remote Work vs Office", style: "Professional" },
            { topic: "Learning to code at 30", style: "Casual" },
            { topic: "The biggest mistake I made in my first startup", style: "Storytelling" },
            { topic: "Why AI won't replace good developers", style: "Enthusiastic" },
            { topic: "Stop overthinking your pricing", style: "Professional" },
        ];
        
        let results = [];
        for (const test of tests) {
            const content = await generatePost({
                topic: test.topic,
                style: test.style,
                targetLength: 400
            });
            const hook = content.split('\n')[0];
            results.push({ test, hook });
        }

        return NextResponse.json({ results });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
    }
}
