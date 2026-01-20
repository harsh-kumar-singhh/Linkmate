import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "./prisma";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

const prisma = getPrisma();

export const authOptions: NextAuthConfig = {
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    // =========================
    // CREDENTIALS (EMAIL/PASSWORD)
    // =========================
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // ✅ HARD GUARDS
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) return null;

        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "credentials",
          },
        });

        if (!account?.access_token) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          account.access_token
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),

    // =========================
    // GOOGLE (OIDC – KEEP AS IS)
    // =========================
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // =========================
    // LINKEDIN (OAUTH – BLOCK IF NO EMAIL)
    // =========================
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,

      authorization: {
        params: {
          scope: "r_liteprofile r_emailaddress w_member_social",
        },
      },

      profile(profile) {
        if (!profile.email) {
          throw new Error(
            "LinkedIn did not share your email. Please enable email access."
          );
        }

        return {
          id: profile.id,
          name: profile.name ?? "LinkedIn User",
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth-error",
  },

  debug: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);