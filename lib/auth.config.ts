import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user

      // NEVER touch auth callback routes
      if (nextUrl.pathname.startsWith("/api/auth")) {
        return true
      }

      const protectedRoutes =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/posts") ||
        nextUrl.pathname.startsWith("/calendar") ||
        nextUrl.pathname.startsWith("/settings")

      const authRoutes =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/signup"

      if (protectedRoutes && !isLoggedIn) {
        return false
      }

      if (authRoutes && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) token.id = user.id
      if (account) token.accessToken = account.access_token
      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },

  providers: [],
} satisfies NextAuthConfig