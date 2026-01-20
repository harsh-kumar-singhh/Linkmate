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
    // ---------- GOOGLE (OIDC, stable) ----------
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ---------- LINKEDIN (LEGACY OAUTH, SAFE) ----------
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,

      // Disable PKCE → legacy compatible
      checks: ["state"],

      authorization: {
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
        },
      },

      profile(profile) {
        const id = profile.id

        const firstName =
          (profile as any).localizedFirstName ?? "LinkedIn"
        const lastName =
          (profile as any).localizedLastName ?? "User"

        // Email MAY be missing → must be nullable
        const email =
          (profile as any)?.emailAddress ??
          (profile as any)?.elements?.[0]?.["handle~"]?.emailAddress ??
          null

        return {
          id,
          name: `${firstName} ${lastName}`,
          email,
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

export const { handlers, auth } = NextAuth(authConfig)