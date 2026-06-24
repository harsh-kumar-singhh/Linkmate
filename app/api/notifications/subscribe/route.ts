import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ──────────────────────────────────────────────────────────────────────────────
// Lightweight User-Agent parser
// No external dependency — good enough to distinguish Mac/iOS/Android/Windows
// and Chrome/Firefox/Safari/Edge/Samsung.
// ──────────────────────────────────────────────────────────────────────────────
function parseUserAgent(ua: string | null): { browser: string; deviceType: string } {
  if (!ua) return { browser: "Unknown", deviceType: "Unknown" };

  // Device type
  let deviceType = "Desktop";
  if (/iPad/i.test(ua)) deviceType = "Tablet";
  else if (/iPhone/i.test(ua)) deviceType = "iPhone";
  else if (/Android.*Mobile/i.test(ua)) deviceType = "Android Phone";
  else if (/Android/i.test(ua)) deviceType = "Android Tablet";

  // Browser (order matters — Edge/Samsung must come before Chrome)
  let browser = "Unknown";
  if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) browser = "Opera";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return { browser, deviceType };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const subscription = await req.json();
    const ua = req.headers.get("user-agent");
    const { browser, deviceType } = parseUserAgent(ua);

    const result = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        browser,
        deviceType,
        lastSeenAt: new Date(),
        isActive: true,
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        browser,
        deviceType,
        lastSeenAt: new Date(),
        isActive: true,
      },
    });

    console.log(
      `[PUSH_SUB] Registered | subscriptionId=${result.id} | userId=${session.user.id} | browser=${browser} | deviceType=${deviceType}`
    );

    return NextResponse.json({ success: true, subscriptionId: result.id });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { endpoint } = await req.json();

    // Soft-deactivate instead of hard-delete so traces remain traceable
    await prisma.pushSubscription.updateMany({
      where: { endpoint, userId: session.user.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating subscription:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
