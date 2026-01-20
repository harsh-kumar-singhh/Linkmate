import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "./prisma"

import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"

import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const prisma = getPrisma()

export const authOptions: NextAuthConfig = {
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  providers: [
    // =========================
    // Credentials Provider
    // =========================
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // ✅ Explicitly cast AFTER validation
        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: { accounts: true },
        })

        if (!user) return null

        const credentialsAccount = user.accounts.find(
          (account) => account.provider === "credentials"
        )

        if (!credentialsAccount?.access_token) return null

        const isValid = await bcrypt.compare(
          password,
          credentialsAccount.access_token
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),

    // =========================
    // Google (OIDC)
    // =========================
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // =========================
    // LinkedIn (OAuth2 – NOT OIDC)
    // =========================
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,

      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: {
          scope: "openid profile email w_member_social",
        },
      },

      token: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfo: "https://api.linkedin.com/v2/userinfo",

      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],

  callbacks: {
    async jwt(params) {
      const token = authConfig.callbacks?.jwt
        ? await authConfig.callbacks.jwt(params as any)
        : params.token

      if (params.user) {
        token.id = params.user.id
      }

      return token
    },

    async session(params) {
      const session = authConfig.callbacks?.session
        ? await authConfig.callbacks.session(params as any)
        : params.session

      if (session.user && params.token?.id) {
        session.user.id = params.token.id as string
      }

      return session
    },
  },

  debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)