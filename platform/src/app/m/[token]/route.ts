import { NextResponse, type NextRequest } from "next/server";
import { issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { MEMBER_SESSION_TTL_SECONDS } from "@/lib/auth/token";
import { getEnv } from "@/lib/env";
import { audit } from "@/lib/security/audit";
import { checkRateLimit } from "@/lib/security/ratelimit";
import { clientIp } from "@/lib/security/request";
import { resolveMemberLink } from "@/lib/services/members";

/**
 * GET /m/<token> — the wallet link the clinic sends on WhatsApp.
 * Opens the member's wallet on this phone without a password. The token is bound to the
 * account's session version, so "sign out everywhere" or a password change cancels it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = getEnv().APP_URL;
  const ip = clientIp(request);
  if (ip !== "unknown") {
    const limit = checkRateLimit(`memberlink:${ip}`, 30, 15 * 60_000);
    if (!limit.allowed) return new NextResponse("Too many attempts. Try again in a few minutes.", { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  const user = await resolveMemberLink(token);
  if (!user) {
    const login = new URL("/login", base);
    login.searchParams.set("next", "/portal/wallet");
    login.searchParams.set("link", "expired");
    return NextResponse.redirect(login, { status: 302 });
  }

  const sessionToken = await issueSessionToken(user, MEMBER_SESSION_TTL_SECONDS);
  const destination = new URL("/portal/wallet", base);
  for (const key of ["checkin", "room", "branch"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) destination.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(destination, { status: 302 });
  response.cookies.set(sessionCookie(sessionToken, MEMBER_SESSION_TTL_SECONDS));
  await audit({ action: "auth.login", actor: { type: "USER", id: user.id }, request, meta: { via: "member_link" } });
  return response;
}
