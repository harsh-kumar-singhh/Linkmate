import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get("x-razorpay-signature")
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const payload = JSON.parse(body)
    const event = payload.event

    if (event === "payment.captured") {
      const { userId, plan } = payload.payload.payment.entity.notes
      
      if (userId && plan === "pro") {
        const prisma = getPrisma()
        await prisma.user.update({
          where: { id: userId },
          data: { plan: "pro" },
        })
        console.log(`[PAYMENT] User ${userId} upgraded to Pro`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Razorpay Webhook Error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
