import type { NextConfig } from "next";

const backendUrl = process.env.API_BACKEND_URL?.trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) {
      return [];
    }
    // Filesystem route apps/web/app/api/quote wins over this rewrite.
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
