import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getPrisma } from "@/lib/prisma"
import { decryptState } from "@/lib/oauth-state"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log(`[LinkedIn Callback] Received params:`, { code: code ? "****" : null, state, error, errorDescription })

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://www.linkmateapp.me"

    if (error || !code) {
        console.error(`[LinkedIn Callback] Error during callback: ${error} - ${errorDescription}`)
        return NextResponse.redirect(`${baseUrl}/settings/linkedin?error=callback_failed`)
    }

    if (!state) {
        console.error("[LinkedIn Callback] No state parameter provided")
        return NextResponse.redirect(`${baseUrl}/settings/linkedin?error=missing_state`)
    }

    let userId: string;
    try {
        const payload = decryptState(state)
        userId = payload.userId
        console.log(`[LinkedIn Callback] Decrypted userId: ${userId}`)
    } catch (err: any) {
        console.error("[LinkedIn Callback] State validation failed:", err.message)
        return NextResponse.redirect(`${baseUrl}/settings/linkedin?error=invalid_state`)
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const redirectUri = `${baseUrl}/api/linkedin/callback`

    try {
        // 1. Exchange code for access token
        console.log("[LinkedIn Callback] Exchanging code for access token...")
        const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: clientId!,
                client_secret: clientSecret!,
            }),
        })

        const tokenData = await tokenResponse.json()
        console.log("[LinkedIn Callback] Token response status:", tokenResponse.status)

        if (!tokenResponse.ok) {
            console.error("[LinkedIn Callback] Token exchange failed:", tokenData)
            return NextResponse.json({ error: "Token exchange failed", details: tokenData }, { status: 400 })
        }

        const accessToken = tokenData.access_token
        const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in

        // 2. Fetch LinkedIn Member ID
        console.log("[LinkedIn Callback] Fetching LinkedIn member profile...")
        const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        const profileData = await profileResponse.json()
        console.log("[LinkedIn Callback] Profile response status:", profileResponse.status)

        if (!profileResponse.ok) {
            console.error("[LinkedIn Callback] Profile fetch failed:", profileData)
            return NextResponse.json({ error: "Profile fetch failed", details: profileData }, { status: 400 })
        }

        const linkedinMemberId = profileData.sub || profileData.id
        if (!linkedinMemberId) {
            console.error("[LinkedIn Callback] Could not find LinkedIn Member ID in response")
            return NextResponse.json({ error: "Member ID not found" }, { status: 400 })
        }

        // 3. Store in Database
        const prisma = getPrisma()
        console.log(`[LinkedIn Callback] Updating user ${userId} with LinkedIn connection...`)

        await prisma.$transaction([
            prisma.account.upsert({
                where: {
                    provider_providerAccountId: {
                        provider: "linkedin",
                        providerAccountId: linkedinMemberId,
                    }
                },
                update: {
                    access_token: accessToken,
                    expires_at: expiresAt,
                    scope: tokenData.scope,
                    email: profileData.email,
                    userId: userId, // Ensure it's linked to the correct user
                },
                create: {
                    userId: userId,
                    type: "oauth",
                    provider: "linkedin",
                    providerAccountId: linkedinMemberId,
                    access_token: accessToken,
                    expires_at: expiresAt,
                    scope: tokenData.scope,
                    email: profileData.email,
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: { linkedinConnected: true }
            })
        ])

        console.log("[LinkedIn Callback] Synchronization complete.")

        // Clear caches for pages that depend on LinkedIn connection status
        const { revalidatePath } = await import("next/cache")
        revalidatePath("/settings")
        revalidatePath("/settings/linkedin")
        revalidatePath("/dashboard")
        revalidatePath("/api/user/me")

        return NextResponse.redirect(`${baseUrl}/settings/linkedin?success=true`)

    } catch (err: any) {
        console.error("[LinkedIn Callback] Unexpected error:", err)
        return NextResponse.redirect(`${baseUrl}/settings/linkedin?error=unexpected&message=${encodeURIComponent(err.message)}`)
    }
}
