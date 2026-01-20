import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect("/login");
  }

  const state = `${session.user.id}:${crypto.randomUUID()}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/linkedin/callback`,
    scope: "r_liteprofile r_emailaddress",
    state,
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
}