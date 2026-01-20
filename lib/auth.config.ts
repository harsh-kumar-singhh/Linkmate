// lib/auth.config.ts
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // REQUIRED for NextAuthConfig typing
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedPaths = [
        "/dashboard",
        "/posts",
        "/calendar",
        "/settings",
      ]

      const isProtected = protectedPaths.some((path) =>
        nextUrl.pathname.startsWith(path)
      )

      if (isProtected && !isLoggedIn) {
        return false
      }

      if (
        isLoggedIn &&
        (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
}