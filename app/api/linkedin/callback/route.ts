import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { decryptState } from "@/lib/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Validate authorization code
  if (!code) {
    console.error("[LinkedIn] Missing authorization code");
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  // Validate and decrypt state parameter (NO SESSION ACCESS)
  if (!state) {
    console.error("[LinkedIn] Missing state parameter");
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed", req.url)
    );
  }

  let userId: string;
  try {
    const decrypted = decryptState(state);
    userId = decrypted.userId;
    console.log("[LinkedIn] State validated successfully for user:", userId);
  } catch (error) {
    console.error("[LinkedIn] State validation failed:", error);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed&error=invalid_state", req.url)
    );
  }

  // Exchange authorization code for access token
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
    console.error("[LinkedIn] Token exchange failed:", tokenData);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed&error=token_exchange", req.url)
    );
  }

  // Fetch LinkedIn profile
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
    console.error("[LinkedIn] Profile fetch failed:", profile);
    return NextResponse.redirect(
      new URL("/settings?linkedin=failed&error=profile_fetch", req.url)
    );
  }

  // Store LinkedIn account credentials
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "linkedin",
        providerAccountId: profile.id,
      },
    },
    update: {
      access_token: tokenData.access_token,
      userId: userId, // userId from decrypted state
    },
    create: {
      userId: userId, // userId from decrypted state
      type: "oauth",
      provider: "linkedin",
      providerAccountId: profile.id,
      access_token: tokenData.access_token,
    },
  });

  console.log("[LinkedIn] Account connected successfully for user:", userId);

  return NextResponse.redirect(
    new URL("/settings?linkedin=connected", req.url)
  );
}
