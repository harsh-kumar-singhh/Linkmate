import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },

  providers: [],

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
  },
}