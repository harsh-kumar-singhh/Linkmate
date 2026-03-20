export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * TEST ENDPOINT: Downgrade the currently logged-in user to FREE plan.
 * Used for testing the upgrade flow from a clean slate.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Update user to FREE
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                plan: "FREE",
                planExpiry: null,
                autopilotEnabled: false,
                razorpaySubscriptionId: null,
            } as any,
        });

        console.log(`[TEST DOWNGRADE] Successfully downgraded user: ${userId} to FREE`);

        return NextResponse.json({
            success: true,
            message: "Successfully downgraded to FREE",
            user: {
                id: (updatedUser as any).id,
                plan: (updatedUser as any).plan,
                autopilotEnabled: (updatedUser as any).autopilotEnabled,
            }
        });
    } catch (error: any) {
        console.error("[TEST DOWNGRADE] Downgrade failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
