import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"

import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"

import bcrypt from "bcryptjs"
import { getPrisma } from "./prisma"
import { authConfig } from "./auth.config"

const prisma = getPrisma()

const isProduction = process.env.NODE_ENV === "production"
const useSecureCookies = isProduction
const cookiePrefix = useSecureCookies ? "__Secure-" : ""

export const authOptions: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,

  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },

  pages: authConfig.pages,

  providers: [
    // ================= CREDENTIALS =================
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null
        }

        const email = credentials.email
        const password = credentials.password

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            accounts: {
              where: { provider: "credentials" },
            },
          },
        })

        if (!user || user.accounts.length === 0) {
          return null
        }

        const account = user.accounts[0]

        if (!account.access_token) {
          return null
        }

        const isValid = await bcrypt.compare(
          password,
          account.access_token
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        }
      },
    }),

    // ================= GOOGLE =================
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ================= LINKEDIN (OIDC) =================
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,

      issuer: "https://www.linkedin.com/oauth",
      wellKnown:
        "https://www.linkedin.com/oauth/openid/.well-known/openid-configuration",

      authorization: {
        params: {
          scope: "openid profile email w_member_social",
        },
      },

      checks: ["pkce", "state"],

      async profile(profile) {
        if (!profile.sub || !profile.email) {
          throw new Error("Invalid LinkedIn profile")
        }

        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name ?? undefined,
          image: profile.picture ?? undefined,
        }
      },
    }),
  ],

  callbacks: {
    authorized: authConfig.callbacks?.authorized,

    async signIn({ account, user }) {
      if (account?.provider === "linkedin") {
        console.log("[LINKEDIN] signIn success", user?.email)
      }
      return true
    },

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
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id
      }
      return session
    },
  },

  debug: !isProduction,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)