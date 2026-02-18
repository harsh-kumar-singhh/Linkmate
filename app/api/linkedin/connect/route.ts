import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { encryptState } from "@/lib/oauth-state"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    console.error("[LinkedIn Connect] Unauthorized: No active session")
    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://www.linkmateapp.me"
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://www.linkmateapp.me"
  const redirectUri = `${baseUrl}/api/linkedin/callback`
  const scope = "openid profile email w_member_social"
  const state = encryptState(session.user.id)

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization")
  authUrl.searchParams.append("response_type", "code")
  authUrl.searchParams.append("client_id", clientId!)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("state", state)
  authUrl.searchParams.append("scope", scope)

  console.log(`[LinkedIn] Redirecting to: ${authUrl.toString()}`)

  return NextResponse.redirect(authUrl.toString())
}
