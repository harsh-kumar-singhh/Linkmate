import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

/**
 * TEMPORARY: Endpoint to simulate a successful Razorpay subscription activation for the current user.
 * This is for testing purposes ONLY and should be removed before production.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const prisma = getPrisma();
        const userId = session.user.id;

        // Simulate 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Update user to PRO
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                plan: "PRO",
                planExpiry: expiryDate,
                razorpaySubscriptionId: "test_sub_sim_123",
            } as any, // Cast to any to avoid IDE false positives
        });

        console.log(`[TEST WEBHOOK] Successfully simulated PRO upgrade for user: ${userId}`);

        return NextResponse.json({
            success: true,
            message: "Successfully simulated subscription activation",
            user: {
                id: (updatedUser as any).id,
                plan: (updatedUser as any).plan,
                planExpiry: (updatedUser as any).planExpiry,
            }
        });
    } catch (error: any) {
        console.error("[TEST WEBHOOK] Simulation failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
