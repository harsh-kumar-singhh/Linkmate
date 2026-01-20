import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // 1️⃣ Basic validation
  if (!code || !state || !state.includes(":")) {
    console.error("LinkedIn callback missing code or state", { code, state });
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // 2️⃣ Extract userId from state
  const userId = state.split(":")[0];

  if (!userId) {
    console.error("Invalid state, userId missing:", state);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // 3️⃣ Exchange authorization code for access token
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
    console.error("LinkedIn token exchange failed:", tokenData);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // 4️⃣ Fetch LinkedIn profile
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = await profileRes.json();

  if (!profile?.id) {
    console.error("LinkedIn profile fetch failed:", profile);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // 5️⃣ Save / update LinkedIn account
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

  // 6️⃣ Success redirect
  return NextResponse.redirect(
    new URL("/settings?linkedin=connected", req.url)
  );
}