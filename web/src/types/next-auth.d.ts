import type { DefaultSession } from "next-auth";

export type Role = "admin" | "iif_staff" | "school";

declare module "@auth/core/types" {
  interface Session {
    accessToken: string;
    error?: "RefreshTokenError";
    user: {
      id: string;
      username: string;
      role: Role;
      schoolId: number | null;
      displayName: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: Role;
    schoolId: number | null;
    displayName: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    schoolId: number | null;
    displayName: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    error?: "RefreshTokenError";
  }
}
