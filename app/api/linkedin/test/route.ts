import { NextResponse } from "next/server";

export async function GET() {
  const redirectUri = "https://linkmate-bp2u.vercel.app/api/linkedin/test-callback";

  const url =
    "https://www.linkedin.com/oauth/v2/authorization" +
    "?response_type=code" +
    "&client_id=" + process.env.LINKEDIN_CLIENT_ID +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&scope=r_liteprofile" +
    "&state=test123";

  return NextResponse.redirect(url);
}