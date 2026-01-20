import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");

  if (!code) {
    console.error("[LinkedIn] Missing code");
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  const tokenRes = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    }
  );

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error("[LinkedIn] Token error", tokenData);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  const profileRes = await fetch(
    "https://api.linkedin.com/v2/me",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  );

  const profile = await profileRes.json();

  if (!profile?.id) {
    console.error("[LinkedIn] Profile fetch failed", profile);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "linkedin",
        providerAccountId: profile.id,
      },
    },
    update: {
      access_token: tokenData.access_token,
      userId: session.user.id,
    },
    create: {
      userId: session.user.id,
      type: "oauth",
      provider: "linkedin",
      providerAccountId: profile.id,
      access_token: tokenData.access_token,
    },
  });

  return NextResponse.redirect(
    new URL("/settings?linkedin=connected", req.url)
  );
}