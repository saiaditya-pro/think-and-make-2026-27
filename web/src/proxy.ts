import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` -- see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  // admin/static/media bypass the NextAuth gate -- they're proxied straight
  // to the Django admin (see next.config.ts), which has its own login/session.
  matcher: ["/((?!api|admin|static|media|_next/static|_next/image|favicon.ico).*)"],
};
