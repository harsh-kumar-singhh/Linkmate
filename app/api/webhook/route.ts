import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log("[WEBHOOK] Received incoming request at /api/webhook");

    if (!secret) {
      console.error("[WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
    }

    if (!signature) {
      console.warn("[WEBHOOK] Missing x-razorpay-signature header");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[WEBHOOK] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    
    console.log(`[WEBHOOK] Verified signature. Event type: ${event}`);
    console.log("[WEBHOOK] Payload summary:", JSON.stringify(payload, null, 2));

    const prisma = getPrisma();

    if (event === "subscription.activated") {
      const subscription = payload.payload.subscription.entity;
      const notes = subscription.notes;
      const userId = notes.userId;

      if (userId) {
        // Calculate expiry: 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "PRO",
            planExpiry: expiryDate,
            razorpaySubscriptionId: subscription.id,
          },
        });
        console.log(`[WEBHOOK] User ${userId} plan upgraded to PRO (Expiry: ${expiryDate.toISOString()})`);
      } else {
        console.warn("[WEBHOOK] userId not found in subscription notes");
      }
    } 
    else if (event === "subscription.cancelled") {
      const subscription = payload.payload.subscription.entity;
      const notes = subscription.notes;
      const userId = notes.userId;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "FREE",
            autopilotEnabled: false,
          },
        });
        console.log(`[WEBHOOK] User ${userId} plan downgraded to FREE and autopilot disabled`);
      } else {
        console.warn("[WEBHOOK] userId not found in cancellation notes");
      }
    }
    else if (event === "payment.captured") {
      console.log("[WEBHOOK] Payment captured - logging only");
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[WEBHOOK] Error handling webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", details: error.message },
      { status: 500 }
    );
  }
}
