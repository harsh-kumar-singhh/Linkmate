import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = "https://linkmate-bp2u.vercel.app/api/linkedin/callback"
  const scope = "r_liteprofile r_emailaddress w_member_social"
  const state = Math.random().toString(36).substring(2, 15)

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization")
  authUrl.searchParams.append("response_type", "code")
  authUrl.searchParams.append("client_id", clientId!)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("state", state)
  authUrl.searchParams.append("scope", scope)

  console.log(`[LinkedIn] Redirecting to: ${authUrl.toString()}`)

  return NextResponse.redirect(authUrl.toString())
}
