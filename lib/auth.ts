import NextAuth, { NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "./prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import LinkedInProvider from "next-auth/providers/linkedin"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const secret = process.env.NEXTAUTH_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;
const useSecureCookies = process.env.NODE_ENV === "production"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""

// Warning log for missing secret
if (!secret) {
  console.warn("WARNING: NEXTAUTH_SECRET is missing. This will cause persistent authentication failures.");
}

// Log configuration for debugging (simplified for static context)
if (process.env.NODE_ENV === "production") {
  console.log("[AUTH_INIT] Configuration:", {
    hasSecret: !!secret,
    hasUrl: !!nextAuthUrl,
    cookieSecure: useSecureCookies
  });
}

export const authOptions: NextAuthConfig = {
  ...authConfig,
  secret: secret,
  adapter: PrismaAdapter(getPrisma()),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    }
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null
        }

        const prisma = getPrisma()
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            accounts: {
              where: { provider: "credentials" }
            }
          }
        })

        if (!user) {
          console.log("User not found");
          return null
        }

        const credentialsAccount = user.accounts[0]

        if (!credentialsAccount?.access_token) {
          console.log("No credentials account found or password missing");
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          credentialsAccount.access_token
        )

        if (!isValid) {
          console.log("Invalid password");
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      issuer: "https://www.linkedin.com/oauth",
      authorization: {
        params: {
          scope: "openid profile email w_member_social",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
