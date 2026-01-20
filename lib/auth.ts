import NextAuth, { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"

import { getPrisma } from "./prisma"
import { authConfig } from "./auth.config"

const prisma = getPrisma()

export const authOptions: NextAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },

  providers: [
    // ------------------------
    // EMAIL / PASSWORD
    // ------------------------
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { accounts: true },
        })

        if (!user) return null

        const credentialsAccount = user.accounts.find(
          (acc: { provider: string }) => acc.provider === "credentials"
        )

        if (!credentialsAccount?.access_token) return null

        const valid = await bcrypt.compare(
          credentials.password,
          credentialsAccount.access_token
        )

        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),

    // ------------------------
    // GOOGLE (OIDC – STABLE)
    // ------------------------
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ------------------------
    // LINKEDIN (LEGACY OAUTH)
    // ------------------------
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
        },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfo: "https://api.linkedin.com/v2/me",
      profile(profile) {
        return {
          id: profile.id,
          name:
            `${profile.localizedFirstName ?? ""} ${profile.localizedLastName ?? ""}`.trim() ||
            "LinkedIn User",
          email: null, // ✔ allowed by module augmentation
          image: null,
        }
      },
    }),
  ],

  debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)