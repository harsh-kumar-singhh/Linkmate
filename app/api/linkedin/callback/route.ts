import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // Exchange code for access token
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
    console.error("LinkedIn token error:", tokenData);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // Fetch LinkedIn profile
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = await profileRes.json();

  if (!profile?.id) {
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // Save / update account
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "linkedin",
        providerAccountId: profile.id,
      },
    },
    update: {
      access_token: tokenData.access_token,
      userId,
    },
    create: {
      userId,
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