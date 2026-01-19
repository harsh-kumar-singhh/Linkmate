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
  callbacks: {
    ...(authConfig.callbacks || {}),
    async signIn({ user, account, profile }) {
      if (account?.provider === "linkedin") {
        console.log("[LINKEDIN_AUTH] SignIn Callback:", {
          userEmail: user.email,
          userId: user.id,
          accountProvider: account.provider,
          profileSub: profile?.sub
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      if (account?.provider === "linkedin") {
        console.log("[LINKEDIN_AUTH] JWT Callback:", {
          tokenSub: token.sub,
          trigger
        });
      }
      // Pass through to original callbacks logic if needed,
      // but since we are replacing the entire authOptions object structure in previous steps or relying on merging,
      // and here we are in lib/auth.ts where we can access authConfig.
      // We must ensure we don't break the existing jwt logic from auth.config.ts which we are spreading via ...authConfig.
      // However, declaring `callbacks` here OVERRIDES `...authConfig`.
      // So we must explicitly call the original logic.

      if (authConfig.callbacks?.jwt) {
        return authConfig.callbacks.jwt({ token, user, account, profile, trigger } as any);
      }
      return token;
    },
    // We must also re-declare session/authorized if we are overriding the whole callbacks object,
    // OR we can spread ...authConfig.callbacks
    // But we can't spread AND define methods with same name easily in object literal without overrides order mattering.
    // The safely merged version:
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
      jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
      authorization: {
        params: {
          scope: "openid profile email w_member_social",
        },
      },
      async profile(profile) {
        console.log("[LINKEDIN_AUTH] Profile Callback:", profile);
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
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
