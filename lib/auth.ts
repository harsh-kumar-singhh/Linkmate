import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "./prisma"

import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"

import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const secret = process.env.NEXTAUTH_SECRET

if (!secret) {
  console.warn("⚠️ NEXTAUTH_SECRET is missing")
}

export const authOptions: NextAuthConfig = {
  ...authConfig,

  secret,
  adapter: PrismaAdapter(getPrisma()),

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "linkedin") {
        console.log("[LINKEDIN] signIn ok", {
          userId: user.id,
          email: user.email,
        })
      }
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }

      if (account?.provider === "linkedin") {
        token.linkedinAccessToken = account.access_token
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },

  providers: [
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

    const email = credentials.email as string
    const password = credentials.password as string

    const prisma = getPrisma()

    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    })

    if (!user) {
      return null
    }

    const credentialsAccount = user.accounts.find(
      (a: { provider: string; access_token: string | null }) =>
        a.provider === "credentials"
    )

    if (!credentialsAccount?.access_token) {
      return null
    }

    const isValid = await bcrypt.compare(
      password,
      credentialsAccount.access_token
    )

    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  },
}),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ✅ PURE OIDC LINKEDIN — NO LEGACY OVERRIDES
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

  debug: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)