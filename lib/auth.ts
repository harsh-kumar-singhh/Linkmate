import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import LinkedIn from "next-auth/providers/linkedin"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Session, User, Account } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { getPrisma } from "@/lib/prisma"

const prisma = getPrisma()

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt" as const, // 👈 THIS FIXES YOUR ERROR
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ✅ Legacy OAuth (NOT OIDC)
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT
      user?: User
      account?: Account | null
    }) {
      if (user?.id) {
        token.id = user.id
      }

      if (account?.access_token) {
        token.accessToken = account.access_token
      }

      return token
    },

    async session({
      session,
      token,
    }: {
      session: Session
      token: JWT
    }) {
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

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth(authOptions)