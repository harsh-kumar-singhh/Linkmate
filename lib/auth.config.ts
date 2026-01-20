// ❗ DO NOT type this as NextAuthConfig
// This is a PARTIAL config merged later

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }: any) {
      const isLoggedIn = !!auth?.user;

      const protectedRoutes = [
        "/dashboard",
        "/posts",
        "/calendar",
        "/settings",
      ];

      const isProtected = protectedRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      );

      if (isProtected && !isLoggedIn) return false;

      return true;
    },
  },
};