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
        console.log("[Cron] Starting Daily Autopilot Maintenance...");
        
        // Find all users with autopilot enabled and pro plan
        const users = await prisma.user.findMany({
            where: {
                autopilotEnabled: true,
                plan: "PRO",
            },
            select: { id: true, email: true }
        });

        console.log(`[Cron] Found ${users.length} eligible PRO users with Autopilot active.`);

        const results = [];
        for (const user of users) {
            try {
                process.stdout.write(`[Cron] Processing user ${user.id} (${user.email})... `);
                const posts = await generateAutopilotPosts(user.id);
                const count = posts?.length || 0;
                console.log(`Done. Generated ${count} posts.`);
                results.push({ userId: user.id, email: user.email, postsGenerated: count });
            } catch (err) {
                console.error(`\n[Cron] Failed for user ${user.id}:`, err);
                results.push({ userId: user.id, email: user.email, error: "Failed" });
            }
        }

        console.log("[Cron] Autopilot Maintenance Complete.");
        return NextResponse.json({
            success: true,
            totalUsersProcessed: users.length,
            summary: results
        });

    } catch (error) {
        console.error("[Cron] CRITICAL ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
