import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "@/lib/autopilot/generator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized. Please log in first." },
            { status: 401 }
        );
    }

    try {
        console.log(`[Autopilot-Test] Manual trigger for user ${session.user.id}`);

        // ✅ Get user's selected days
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { autopilotDays: true }
        });

        const days = user?.autopilotDays as string[];

        if (!days || days.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No autopilot days configured."
            });
        }

        // ✅ Generate for first selected day (for testing)
        const result = await generateAutopilotPosts(session.user.id, days[0]);

        return NextResponse.json({
            success: true,
            message: `Generated ${result ? 1 : 0} post.`,
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