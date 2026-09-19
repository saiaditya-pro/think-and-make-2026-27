import type { NextConfig } from "next";

const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Django's admin URLs always end in a trailing slash (APPEND_SLASH). Next
      // strips trailing slashes from every incoming request before rewrites run
      // (trailingSlash: false, the default), so the destination re-adds the
      // slash itself -- otherwise Django would redirect back to the slash
      // version, which Next would strip again, looping forever.
      { source: "/admin", destination: `${DJANGO_BASE_URL}/admin/` },
      { source: "/admin/:path+", destination: `${DJANGO_BASE_URL}/admin/:path+/` },
      { source: "/static/:path*", destination: `${DJANGO_BASE_URL}/static/:path*` },
      { source: "/media/:path*", destination: `${DJANGO_BASE_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;
