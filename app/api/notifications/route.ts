import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const ALLOWED_NOTIFICATION_EVENTS = [
      'scheduled_post_published',
      'scheduled_post_failed',
      'pro_plan_limit_approaching',
      'pro_plan_limit_reached',
      'subscription_payment_failed',
      'subscription_renewed',
      'trial_or_plan_expiry_warning'
    ];

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        type: {
          in: ALLOWED_NOTIFICATION_EVENTS
        }
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id, readAll, action = "read" } = await req.json();

    if (readAll) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });
    } else if (id) {
      const dataToUpdate: any = { read: true };
      if (action === "click") {
        dataToUpdate.clicked = true;
      }
      
      await prisma.notification.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: dataToUpdate,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
