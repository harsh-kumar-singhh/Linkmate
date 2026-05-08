import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerInactivityReminder } from "@/lib/notifications";

export async function POST(req: Request) {
  // REMOVED: Generic reminders are no longer sent
  return NextResponse.json({
    message: "Reminders are currently disabled by product policy",
    processed: 0
  });
}
