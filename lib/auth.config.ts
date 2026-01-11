import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') ||
                nextUrl.pathname.startsWith('/posts') ||
                nextUrl.pathname.startsWith('/calendar') ||
                nextUrl.pathname.startsWith('/settings')
            const isOnAuth = nextUrl.pathname === '/login' || nextUrl.pathname === '/signup'

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            } else if (isLoggedIn && isOnAuth) {
                return Response.redirect(new URL('/dashboard', nextUrl))
            }
            return true
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id
            }
            if (account) {
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
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
