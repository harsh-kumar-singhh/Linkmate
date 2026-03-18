import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import crypto from "crypto";

const prisma = getPrisma();

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get("x-razorpay-signature");
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!signature || !secret) {
            console.error("[RAZORPAY WEBHOOK] Missing signature or secret");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== signature) {
            console.error("[RAZORPAY WEBHOOK] Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const payload = JSON.parse(body);
        const event = payload.event;
        console.log(`[RAZORPAY WEBHOOK] Received event: ${event}`);

        let userId: string | undefined;
        let expiryTimestamp: number | undefined;
        let subscriptionId: string | undefined;

        // Extract data based on event type
        if (event.startsWith("subscription.")) {
            const subscription = payload.payload.subscription.entity;
            userId = subscription.notes?.userId;
            subscriptionId = subscription.id;
            expiryTimestamp = subscription.current_end || subscription.end_at;
        } else if (event.startsWith("invoice.")) {
            const invoice = payload.payload.invoice.entity;
            userId = invoice.notes?.userId;
            subscriptionId = invoice.subscription_id;
            expiryTimestamp = invoice.billing_end;
        }

        if (!userId) {
            console.warn(`[RAZORPAY WEBHOOK] Could not extract userId for event ${event}`);
            return NextResponse.json({ status: "ok", message: "No userId found" });
        }

        switch (event) {
            case "subscription.authenticated":
            case "subscription.activated":
            case "invoice.paid":
                // Set plan to PRO and use Razorpay expiry timestamp
                // expiryTimestamp is unix timestamp in seconds
                const expiryDate = expiryTimestamp 
                    ? new Date(expiryTimestamp * 1000) 
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        plan: "PRO",
                        planExpiry: expiryDate,
                        razorpaySubscriptionId: subscriptionId,
                    } as any,
                });
                console.log(`[RAZORPAY WEBHOOK] SUCCESS: User ${userId} updated to PRO. Expiry: ${expiryDate.toISOString()}`);
                break;

            case "subscription.cancelled":
            case "subscription.expired":
            case "subscription.halted":
                // Downgrade user to FREE
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        plan: "FREE",
                        autopilotEnabled: false,
                    },
                });
                console.log(`[RAZORPAY WEBHOOK] SUCCESS: User ${userId} downgraded to FREE due to ${event}`);
                break;

            default:
                console.log(`[RAZORPAY WEBHOOK] Unhandled event type: ${event}`);
        }

        return NextResponse.json({ status: "ok" });
    } catch (error: any) {
        console.error("[RAZORPAY WEBHOOK] FATAL ERROR:", error);
        return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
}
