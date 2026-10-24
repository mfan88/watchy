import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Pages and API responses are per-user; never cache them.
        source: "/((?!_next/static|_next/image|matchups|providers|teams|icon.svg).*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/:dir(matchups|providers|teams)/:file*",
        headers: [{ key: "Cache-Control", value: "private, max-age=86400" }],
      },
    ];
  },
};

export default config;
