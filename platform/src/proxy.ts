import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";
import { LIMITS, checkRateLimit } from "@/lib/security/limits";
import { clientIp } from "@/lib/security/request";

/**
 * Runs before every matched request (Next.js 16 "proxy", formerly middleware).
 *
 * 1. Refuses oversized API bodies and rate-limits API calls per IP.
 * 2. Blocks cross-site state-changing API calls that ride on the session cookie (CSRF).
 * 3. Sends signed-out visitors of /admin, /portal and /account to the login page.
 * 4. Keeps patients out of /admin and /api/admin.
 * 5. Adds a per-request Content-Security-Policy nonce to every page.
 *
 * It only verifies the token's signature and expiry. Route handlers and pages
 * re-check the user against the database (deactivated accounts, changed roles,
 * sessionVersion), so this is a fast first gate, not the only one.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/** Bigger than any legitimate request to this app (the largest is an update post). */
const MAX_API_BODY_BYTES = 1024 * 1024;

function bearerToken(request: NextRequest): string | undefined {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}

/** The host visitors see, even behind Hostinger's reverse proxy. */
function publicHost(request: NextRequest): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
}

function publicProto(request: NextRequest): string {
  return request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
}

function publicOrigin(request: NextRequest): string {
  return `${publicProto(request)}://${publicHost(request)}`;
}

/**
 * A browser on another site can make our cookie travel with a POST, but it cannot
 * forge the Origin / Sec-Fetch-Site headers. Requests authenticated with a Bearer
 * token or API key are exempt: they are not sent automatically by browsers.
 */
function isCrossSiteCookieRequest(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (!request.cookies.has(SESSION_COOKIE)) return false;
  if (bearerToken(request)) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== publicHost(request);
  } catch {
    return true;
  }
}

/**
 * Content Security Policy with a fresh nonce per request. Next.js reads the nonce from
 * the request header and attaches it to its own scripts, so only scripts we ship can run.
 * Styles allow 'unsafe-inline' because React's inline style props and Tailwind's
 * runtime-free CSS are harmless, and Google Fonts serve the display typeface.
 */
function contentSecurityPolicy(nonce: string, https: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function json(status: number, error: string, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_API_BODY_BYTES) return json(413, "Request body is too large");

    const ip = clientIp(request);
    if (ip !== "unknown") {
      const limit = checkRateLimit(`api:${ip}`, LIMITS.apiPerIp.limit, LIMITS.apiPerIp.windowMs);
      if (!limit.allowed) return json(429, "Too many requests", { "Retry-After": String(limit.retryAfterSeconds) });
    }

    if (isCrossSiteCookieRequest(request)) return json(403, "Cross-site request blocked");
  }

  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const needsUser =
    needsAdmin || pathname.startsWith("/portal") || pathname.startsWith("/account") || pathname.startsWith("/api/me");

  if (needsUser) {
    const token = request.cookies.get(SESSION_COOKIE)?.value ?? bearerToken(request);
    const claims = token ? await verifySessionToken(token) : null;

    if (!claims) {
      if (isApi) return json(401, "Sign in required");
      const login = new URL("/login", publicOrigin(request));
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }

    if (needsAdmin && claims.role !== "ADMIN") {
      if (isApi) return json(403, "Admin access required");
      return NextResponse.redirect(new URL("/portal", publicOrigin(request)));
    }
  }

  // Development keeps the browser's dev tooling working; production gets the strict policy.
  if (isApi || process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, publicProto(request) === "https");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Everything except static assets, which need neither auth nor a CSP nonce.
      source: "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|apple-touch-icon.png|logo.png|logo-milk.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
