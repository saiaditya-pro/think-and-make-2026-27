import type { NextConfig } from "next";

const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /admin on the website opens the Django admin on the backend's own
      // domain. A redirect, not a proxy: proxied through this domain, Django's
      // CSRF check (Origin vs host), its session cookies and its own redirects
      // would all point at the wrong host. Not permanent, so browsers don't
      // cache it if the backend URL changes.
      { source: "/admin", destination: `${DJANGO_BASE_URL}/admin/`, permanent: false },
      { source: "/admin/:path*", destination: `${DJANGO_BASE_URL}/admin/:path*`, permanent: false },
    ];
  },
};

export default nextConfig;
