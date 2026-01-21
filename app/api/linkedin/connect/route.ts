import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encryptState } from "@/lib/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 1. Ensure user is logged in (session checked ONLY at start)
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  // 2. Generate encrypted state containing userId, timestamp, and nonce
  const state = encryptState(session.user.id);

  // 3. Build LinkedIn authorization URL with Legacy OAuth scopes
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/linkedin/callback`,
    scope: "r_liteprofile r_emailaddress w_member_social", // Legacy OAuth scopes for posting
    state,
  });

  // 4. Redirect user to LinkedIn OAuth
  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
}
