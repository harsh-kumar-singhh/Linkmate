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
        // Optional testNow from query (?testNow=ISO_STRING)
        const { searchParams } = new URL(req.url);
        const testNowParam = searchParams.get("testNow");
        const testNow = testNowParam ? new Date(testNowParam) : undefined;

        console.log(
            `[Test API] Triggering autopilot for user ${session.user.id} with testNow: ${
                testNow?.toISOString() || "Real Time"
            }`
        );

        // ✅ Get user's configured days
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

        // ✅ FIXED: Correct function signature usage
        const results = await generateAutopilotPosts(
            session.user.id,
            days[0],        // specificDay (REQUIRED)
            undefined,      // afterDate (skip)
            testNow         // testNow (optional)
        );

        return NextResponse.json({
            success: true,
            message: `Generated ${results ? 1 : 0} post.`,
            data: results
        });

    } catch (error: any) {
        console.error("[Test API] Error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to generate autopilot posts."
            },
            { status: 500 }
        );
    }
}