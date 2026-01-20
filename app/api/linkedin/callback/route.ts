import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("LinkedIn OAuth error:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=linkedin`);
  }

  /* 1️⃣ Exchange code for access token */
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    console.error("LinkedIn token exchange failed");
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=token`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  /* 2️⃣ Fetch LinkedIn profile */
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profile = await profileRes.json();
  const linkedinId = profile.id;

  /* 3️⃣ Fetch email (optional) */
  let email: string | null = null;
  const emailRes = await fetch(
    "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (emailRes.ok) {
    const emailJson = await emailRes.json();
    email = emailJson?.elements?.[0]?.["handle~"]?.emailAddress ?? null;
  }

  /* 4️⃣ Get currently logged-in user (by session cookie) */
  const sessionToken = req.headers.get("cookie")?.match(/next-auth.session-token=([^;]+)/)?.[1];

  if (!sessionToken) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session?.user) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
  }

  /* 5️⃣ Upsert LinkedIn account */
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "linkedin",
        providerAccountId: linkedinId,
      },
    },
    update: {
      access_token: accessToken,
      userId: session.user.id,
    },
    create: {
      provider: "linkedin",
      type: "oauth",
      providerAccountId: linkedinId,
      access_token: accessToken,
      userId: session.user.id,
    },
  });

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?connected=linkedin`);
}