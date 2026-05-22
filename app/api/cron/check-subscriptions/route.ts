import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Cron job to downgrade users whose PRO plan has expired.
 * This should be called regularly (e.g., daily).
 */
async function handleCron(req: Request) {
    try {
        const authError = verifyCronRequest(req);
        if (authError) return authError;

        const now = new Date();

        // 1. Find users with PRO plan that has expired (batching)
        const expiredUsers = await prisma.user.findMany({
            where: {
                plan: "PRO",
                planExpiry: {
                    lt: now,
                },
            } as any,
            select: { id: true, email: true },
            orderBy: { planExpiry: 'asc' },
            take: 50, // Process in batches of 50
        });

        if (expiredUsers.length === 0) {
            return NextResponse.json({ message: "No expired subscriptions found" });
        }

        console.log(`[CRON] Found ${expiredUsers.length} users with expired PRO plans.`);

        // 2. Downgrade users
        const updateResult = await prisma.user.updateMany({
            where: {
                id: {
                    in: expiredUsers.map((u) => u.id),
                },
            },
            data: {
                plan: "FREE",
                autopilotEnabled: false,
            },
        });

        console.log(`[CRON] SUCCESSFULLY Downgraded ${updateResult.count} users.`);

        return NextResponse.json({
            success: true,
            message: `Successfully downgraded ${updateResult.count} users`,
            downgradedCount: updateResult.count
        });
    } catch (error: any) {
        console.error("[CRON ERROR] Subscription check failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return handleCron(req);
}

export async function POST(req: Request) {
    return handleCron(req);
}
