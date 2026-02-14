import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "@/lib/prisma"
import { authConfig } from "./config"

const prisma = getPrisma()

import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        // Check if we have a password hash stored in the Account table
        // This is how the signup route currently stores it
        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "credentials"
          }
        })

        if (!account || !account.access_token) {
          return null
        }

        const passwordsMatch = await bcrypt.compare(password, account.access_token)

        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          }
        }

        return null
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
})
