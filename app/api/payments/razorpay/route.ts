import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Razorpay from "razorpay"

export async function POST(req: Request) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.plan === "pro") {
      return NextResponse.json({ error: "Already on Pro plan" }, { status: 400 })
    }

    // Amount is 249 INR in paise
    const amount = 24900
    const currency = "INR"

    const options = {
      amount,
      currency,
      receipt: `receipt_${session.user.id}_${Date.now()}`,
      notes: {
        userId: session.user.id,
        plan: "pro",
      },
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error: any) {
    console.error("Razorpay Order Creation Error:", error)
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    )
  }
}
