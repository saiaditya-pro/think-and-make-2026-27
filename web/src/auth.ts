import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { jwtExpiryMs } from "@/lib/jwt";

const DJANGO_API_URL = process.env.DJANGO_API_URL ?? "http://127.0.0.1:8000/api/v1";

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(`${DJANGO_API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const data = (await res.json()) as { access: string; refresh?: string };
  return {
    accessToken: data.access,
    refreshToken: data.refresh ?? refreshToken,
    accessTokenExpires: jwtExpiryMs(data.access),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const loginRes = await fetch(`${DJANGO_API_URL}/auth/login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials?.username,
            password: credentials?.password,
          }),
        });
        if (!loginRes.ok) return null;
        const tokens = (await loginRes.json()) as { access: string; refresh: string };

        const meRes = await fetch(`${DJANGO_API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${tokens.access}` },
        });
        if (!meRes.ok) return null;
        const me = (await meRes.json()) as {
          id: number;
          username: string;
          role: "admin" | "iif_staff" | "school";
          school: number | null;
          display_name: string;
        };

        return {
          id: String(me.id),
          username: me.username,
          role: me.role,
          schoolId: me.school,
          displayName: me.display_name || me.username,
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.displayName = user.displayName;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = jwtExpiryMs(user.accessToken);
        return token;
      }

      if (Date.now() < token.accessTokenExpires - 30_000) {
        return token;
      }

      try {
        const refreshed = await refreshAccessToken(token.refreshToken);
        return { ...token, ...refreshed, error: undefined };
      } catch {
        return { ...token, error: "RefreshTokenError" as const };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.role = token.role;
      session.user.schoolId = token.schoolId;
      session.user.displayName = token.displayName;
      return session;
    },
  },
});
