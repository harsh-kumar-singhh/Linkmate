import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import LinkedIn from "next-auth/providers/linkedin"
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
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,

      // Explicitly request scopes for legacy flow
      authorization: {
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
        },
      },

      // 🔑 CRITICAL: Handle missing email safely. Do NOT fallback to fake email.
      profile(profile) {
        const id = profile.id as string

        const firstName =
          (profile as any).localizedFirstName ?? "LinkedIn"
        const lastName =
          (profile as any).localizedLastName ?? "User"

        // LinkedIn API might not return email if not granted or accounted for
        const email = (profile as any).emailAddress || null

        return {
          id,
          name: `${firstName} ${lastName}`,
          email, // Can be null now
          image: null,
        }
      },
    }),
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