import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

const isProd = process.env.NODE_ENV === "production"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  trustHost: true,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  cookies: {
    sessionToken: {
      name: isProd ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    pkceCodeVerifier: {
      name: isProd ? `__Secure-next-auth.pkce.code_verifier` : `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        maxAge: 900 // 15 minutes
      },
    },
    state: {
      name: isProd ? `__Secure-next-auth.state` : `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        maxAge: 900 // 15 minutes
      },
    },
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user

      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/posts") ||
        nextUrl.pathname.startsWith("/calendar") ||
        nextUrl.pathname.startsWith("/settings")

      const isAuthPage =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/signup"

      if (isProtected && !isLoggedIn) return false
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },

    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id
        // @ts-ignore - plan exists on User model
        token.plan = user.plan
      }
      
      // Handle session updates (e.g., after upgrading to Pro)
      if (trigger === "update" && session?.plan) {
        token.plan = session.plan
      }
      
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string
        if (token.plan) session.user.plan = token.plan as string
      }
      return session
    },
  },
}
