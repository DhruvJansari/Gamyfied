import type { NextConfig } from "next";

// The Express API is reached through this rewrite so the browser only ever talks to one
// origin: cookies need no Domain, there is no CORS preflight, and the OAuth callback lands
// on the same host. In production the reverse proxy does the same job.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
