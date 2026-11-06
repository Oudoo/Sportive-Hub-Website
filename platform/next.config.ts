import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything here is behind a login and rendered per request, so the classic
  // dynamic-rendering model is used rather than Cache Components.
  // CSS goes through PostCSS (postcss.config.mjs); production builds use `next build --webpack`.

  // Keep the app from being embedded in other sites; CORS for the API would live in proxy.ts if ever needed.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
