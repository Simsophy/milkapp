import type { NextConfig } from "next";

const backendOrigin =
  process.env.BACKEND_ORIGIN?.replace(/\/$/, "") || "http://localhost:8000";
const backendRouteBase =
  process.env.BACKEND_ROUTE_BASE?.replace(/\/$/, "") || "/routes";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/routes/:path*",
        destination: `${backendOrigin}${backendRouteBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
