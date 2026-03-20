export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "activate";
        const userId = session.user.id;

        if (type === "activate") {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    plan: "PRO",
                    planExpiry: expiryDate,
                    razorpaySubscriptionId: "test_sub_" + Math.random().toString(36).substring(7),
                } as any,
            });

            return NextResponse.json({
                success: true,
                message: "Successfully simulated subscription activation",
                user: {
                    id: (updatedUser as any).id,
                    plan: (updatedUser as any).plan,
                    planExpiry: (updatedUser as any).planExpiry,
                }
            });
        } else if (type === "cancel") {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    plan: "FREE",
                    autopilotEnabled: false,
                } as any,
            });

            return NextResponse.json({
                success: true,
                message: "Successfully simulated subscription cancellation",
                user: {
                    id: (updatedUser as any).id,
                    plan: (updatedUser as any).plan,
                }
            });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error: any) {
        console.error("[TEST WEBHOOK] Simulation failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
