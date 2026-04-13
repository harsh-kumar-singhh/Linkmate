export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generatePost } from "@/lib/gemini";

export async function GET(req: Request) {
    try {
        const cleanedContent = await generatePost({
            topic: "Remote Work",
            style: "Professional",
            targetLength: 700
        });

        return NextResponse.json({ content: cleanedContent });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
    }
}
