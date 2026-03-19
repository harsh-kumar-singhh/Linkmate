import { auth } from "@/lib/auth";
import { generateAutopilotPosts } from "@/lib/autopilot/generator";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow in development or for specifically authorized users if needed
    // For this task, we assume the user is authorized as they are testing.

    const { searchParams } = new URL(req.url);
    const testNowParam = searchParams.get("testNow");
    const testNow = testNowParam ? new Date(testNowParam) : undefined;

    try {
        console.log(`[Test API] Triggering autopilot for user ${session.user.id} with testNow: ${testNow?.toISOString() || "Real Time"}`);
        
        const results = await generateAutopilotPosts(session.user.id, testNow);

        return NextResponse.json({
            success: true,
            simulatedTime: testNow?.toISOString() || new Date().toISOString(),
            postsGenerated: Array.isArray(results) ? results.length : 0,
            results: results
        });
    } catch (error: any) {
        console.error("[Test API] Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
