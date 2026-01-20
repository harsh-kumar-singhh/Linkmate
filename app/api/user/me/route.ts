export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();

  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: {
          where: { provider: "linkedin" },
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            access_token: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ STRICT definition of "connected"
    // Account exists AND access_token exists
    const isConnected = user.accounts.some(
      (account) =>
        account.provider === "linkedin" &&
        account.access_token !== null
    );

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[USER_ME] user=${user.id} linkedinConnected=${isConnected}`
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          writingStyle: user.writingStyle,
          theme: user.theme,
          isConnected,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[USER_ME] Failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}