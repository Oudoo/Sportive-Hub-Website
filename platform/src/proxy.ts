import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";

/**
 * Runs before every matched request (Next.js 16 "proxy", formerly middleware).
 *
 * 1. Blocks cross-site state-changing API calls that ride on the session cookie (CSRF).
 * 2. Sends signed-out visitors of /admin and /portal to the login page.
 * 3. Keeps patients out of /admin and /api/admin.
 *
 * It only verifies the token's signature and expiry. Route handlers and pages
 * re-check the user against the database (deactivated accounts, changed roles),
 * so this is a fast first gate, not the only one.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function bearerToken(request: NextRequest): string | undefined {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}

/** The host visitors see, even behind Hostinger's reverse proxy. */
function publicHost(request: NextRequest): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
}

function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${publicHost(request)}`;
}

/**
 * A browser on another site can make our cookie travel with a POST, but it cannot
 * forge the Origin / Sec-Fetch-Site headers. Requests authenticated with a Bearer
 * token are exempt: they are not sent automatically by browsers.
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && isCrossSiteCookieRequest(request)) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const needsUser = needsAdmin || pathname.startsWith("/portal") || pathname.startsWith("/api/me");
  if (!needsUser) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? bearerToken(request);
  const claims = token ? await verifySessionToken(token) : null;

  if (!claims) {
    if (isApi) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const login = new URL("/login", publicOrigin(request));
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (needsAdmin && claims.role !== "ADMIN") {
    if (isApi) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    return NextResponse.redirect(new URL("/portal", publicOrigin(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/api/:path*"],
};
