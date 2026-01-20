import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "@/lib/prisma"
import type { NextAuthConfig } from "next-auth"

const prisma = getPrisma()

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    // ---------------- GOOGLE (OIDC – works fine) ----------------
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ---------------- LINKEDIN (LEGACY OAUTH) ----------------
    // ---------------- LINKEDIN (STRICT LEGACY OAUTH 2.0) ----------------
    {
      id: "linkedin",
      name: "LinkedIn",
      type: "oauth",
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,

      // CRITICAL: Force Legacy behavior
      // 1. Disable PKCE (LinkedIn Legacy doesn't support it)
      checks: ['state'],

      // 2. Force POST for token exchange (standard for legacy)
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },

      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
          response_type: "code",
        },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",

      userinfo: {
        url: "https://api.linkedin.com/v2/me",
        // 3. Manually fetch profile to avoid OIDC auto-discovery logic
        request: async ({ tokens, client }: any) => {
          if (!tokens?.access_token) {
            throw new Error("LinkedIn Access Token missing");
          }

          // Fetch Basic Profile
          const profileRes = await fetch("https://api.linkedin.com/v2/me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });

          if (!profileRes.ok) throw new Error("Failed to fetch LinkedIn Profile");
          const profile = await profileRes.json();

          // Fetch Email (Separate API call)
          const emailRes = await fetch(
            "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
            {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
          );

          let emailData = null;
          if (emailRes.ok) {
            emailData = await emailRes.json();
          }

          return {
            ...profile,
            emailData,
          };
        },
      },

      profile(profile: any) {
        const id = profile.id;
        const firstName = profile.localizedFirstName ?? "LinkedIn";
        const lastName = profile.localizedLastName ?? "User";

        let email = null;
        if (profile.emailData?.elements?.[0]?.["handle~"]?.emailAddress) {
          email = profile.emailData.elements[0]["handle~"].emailAddress;
        }

        return {
          id,
          name: `${firstName} ${lastName}`,
          email: email,
          image: null,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id
      }

      if (account?.access_token) {
        token.accessToken = account.access_token
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id
      }

      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  debug: process.env.NODE_ENV === "development",
}

// ✅ REQUIRED for App Router
export const { handlers, auth } = NextAuth(authConfig)