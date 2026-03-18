import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { generateAutopilotPosts } from "@/lib/autopilot/generator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    // Basic security check (optional, but recommended for production)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();

    try {
        console.log("[Cron] Starting Autopilot post generation for all users...");
        
        // Find all users with autopilot enabled and pro plan
        const users = await prisma.user.findMany({
            where: {
                autopilotEnabled: true,
                plan: "PRO", // Standardized to uppercase
            },
            select: { id: true }
        });

        console.log(`[Cron] Found ${users.length} active Autopilot users.`);

        const results = [];
        for (const user of users) {
            try {
                const posts = await generateAutopilotPosts(user.id);
                results.push({ userId: user.id, postsGenerated: posts?.length || 0 });
            } catch (err) {
                console.error(`[Cron] Failed for user ${user.id}:`, err);
                results.push({ userId: user.id, error: "Failed" });
            }
        }

        return NextResponse.json({
            success: true,
            summary: results
        });

    } catch (error) {
        console.error("[Cron] Autopilot error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
