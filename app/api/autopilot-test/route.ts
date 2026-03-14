import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAutopilotPosts } from "@/lib/autopilot/generator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    try {
        console.log(`[Autopilot-Test] Manual trigger for user ${session.user.id}`);
        const result = await generateAutopilotPosts(session.user.id);
        
        return NextResponse.json({
            success: true,
            message: `Generated ${result?.length || 0} posts.`,
            data: result
        });
    } catch (error: any) {
        console.error("[Autopilot-Test] Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to generate autopilot posts."
        }, { status: 500 });
    }
}
