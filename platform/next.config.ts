import type { NextConfig } from "next";

/** Response headers every page and API response carries. The CSP (which needs a per-request nonce) is set in proxy.ts. */
const securityHeaders = [
  // Only ever talk to this host over HTTPS once seen over HTTPS (two years, subdomains included).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Never embed the app in another site (clickjacking); CSP frame-ancestors says the same for modern browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these browser features, so deny them to every embedded script.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Everything here is behind a login and rendered per request, so the classic
  // dynamic-rendering model is used rather than Cache Components.
  // CSS goes through PostCSS (postcss.config.mjs); production builds use `next build --webpack`.

  // Do not advertise the framework in responses.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // API responses must never be cached by a browser or an intermediary.
      { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
