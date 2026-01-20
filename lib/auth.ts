import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "@/lib/prisma"
import type { NextAuthConfig } from "next-auth"

const prisma = getPrisma()

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    // ---------------- GOOGLE (OIDC – works fine) ----------------
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ---------------- LINKEDIN (LEGACY OAUTH) ----------------
    // ---------------- LINKEDIN (CUSTOM LEGACY OAUTH) ----------------
    {
      id: "linkedin",
      name: "LinkedIn",
      type: "oauth",
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
          response_type: "code",
        },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfo: {
        url: "https://api.linkedin.com/v2/me",
        async request({ tokens, client }: { tokens: any, client: any }) {
          // 1. Fetch Basic Profile
          const profile = await client.userinfo(tokens.access_token!) as any

          // 2. Fetch Email (Separate API call required for Legacy LinkedIn)
          // We use fetch directly as the client.userinfo is bound to the profile URL
          const emailResponse = await fetch(
            "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
            {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
          )

          let emailData = null
          if (emailResponse.ok) {
            emailData = await emailResponse.json()
          }

          // Combine data for the profile callback
          return {
            ...profile,
            emailData,
          }
        },
      },

      profile(profile: any) {
        const id = profile.id as string

        const firstName = profile.localizedFirstName ?? "LinkedIn"
        const lastName = profile.localizedLastName ?? "User"

        // Extract email from the combined data we fetched in userinfo()
        let email = null
        if (profile.emailData?.elements?.[0]?.["handle~"]?.emailAddress) {
          email = profile.emailData.elements[0]["handle~"].emailAddress
        }

        return {
          id,
          name: `${firstName} ${lastName}`,
          email, // Can be null
          image: null,
        }
      },
    },
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id
      }

      if (account?.access_token) {
        token.accessToken = account.access_token
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id
      }

      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  debug: process.env.NODE_ENV === "development",
}

// ✅ REQUIRED for App Router
export const { handlers, auth } = NextAuth(authConfig)