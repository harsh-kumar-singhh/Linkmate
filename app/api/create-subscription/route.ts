import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const planId = process.env.RAZORPAY_PLAN_ID;
        if (!planId) {
            console.error("RAZORPAY_PLAN_ID is not configured");
            return NextResponse.json({ error: "Payment configuration missing" }, { status: 500 });
        }

        // Create Razorpay subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: 12, // For a year, or however many cycles
            notes: {
                userId: session.user.id,
            },
        });

        console.log(`[Razorpay] Created subscription ${subscription.id} for user ${session.user.id}`);

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
            razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        });
    } catch (error: any) {
        console.error("Razorpay subscription error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
