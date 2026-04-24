import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerInactivityReminder } from "@/lib/notifications";

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find users who haven't posted in 24-48 hours 
    // and haven't received a reminder in the last 7 days
    const usersToRemind = await prisma.user.findMany({
      where: {
        posts: {
          none: {
            createdAt: {
              gte: twentyFourHoursAgo
            }
          }
        },
        notifications: {
          none: {
            type: 'REMINDER',
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      },
      select: {
        id: true
      },
      take: 50 // Batch size
    });

    const results = await Promise.allSettled(
      usersToRemind.map(user => triggerInactivityReminder(user.id))
    );

    return NextResponse.json({
      processed: usersToRemind.length,
      successCount: results.filter(r => r.status === 'fulfilled').length,
      failedCount: results.filter(r => r.status === 'rejected').length
    });
  } catch (error) {
    console.error("Reminder cron failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
