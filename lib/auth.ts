import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "./prisma"

import CredentialsProvider from "next-auth/providers/credentials"
import LinkedInProvider from "next-auth/providers/linkedin"
import GoogleProvider from "next-auth/providers/google"

import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const useSecureCookies = process.env.NODE_ENV === "production"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""

export const authOptions: NextAuthConfig = {
  ...authConfig,

  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(getPrisma()),

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

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "linkedin") {
        console.log("[LINKEDIN_OIDC] signIn success", {
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
      if (account) {
        token.provider = account.provider
        token.accessToken = account.access_token
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
        // ✅ HARD TYPE GUARDS (THIS FIXES ALL ERRORS)
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null
        }

        const prisma = getPrisma()

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { accounts: true }, // ✅ explicitly include relation
        })

        if (!user) return null

        const credentialsAccount = user.accounts.find(
          (account) => account.provider === "credentials"
        )

        if (!credentialsAccount?.access_token) return null

        const isValid = await bcrypt.compare(
          credentials.password,
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
        console.log("[LINKEDIN_OIDC] profile", profile)
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  debug: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)