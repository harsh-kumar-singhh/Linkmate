import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function POST() {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update user plan to PRO and set expiry to 30 days from now
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        plan: "PRO",
        planExpiry: addDays(new Date(), 30),
      },
    });

    return NextResponse.json({ 
      success: true, 
      plan: user.plan, 
      planExpiry: user.planExpiry 
    });
  } catch (error) {
    console.error("Trial activation error:", error);
    return NextResponse.json({ error: "Failed to activate trial" }, { status: 500 });
  }
}
