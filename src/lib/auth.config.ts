import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Bypass auth entirely. The cron route uses bearer-token auth instead.
      const publicRoutes = [
        "/login",
        "/register",
        "/api/auth",
        "/api/register",
        "/api/setup-status",
        "/api/cron",
      ];
      if (publicRoutes.some((route) => pathname.startsWith(route))) return true;

      // Static / PWA assets
      if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/icons") ||
        pathname === "/manifest.json" ||
        pathname === "/sw.js" ||
        pathname === "/favicon.ico"
      ) {
        return true;
      }

      if (!isLoggedIn) return false;

      // Per-route role checks live in the route handlers themselves.
      // We keep the middleware lean so nested admin routes (e.g. /api/users/list,
      // /api/settings/public) can be accessed by any logged-in user.
      return true;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
  },
};
