import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { REFERRAL_CODE_PATTERN, REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE, normalizeReferralCode } from "@/lib/referral";
import { clientIp } from "@/lib/security/request";
import { trackReferralClick } from "@/lib/services/referrals";

/**
 * GET /r/SPORT-ABC123 — the short link patients share.
 * Counts the click, remembers the code in a cookie for a month, and opens registration
 * with the code filled in. Unknown codes still land on the register page, without a code.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeReferralCode(decodeURIComponent(raw));
  const register = new URL("/register", getEnv().APP_URL);

  let valid = false;
  if (REFERRAL_CODE_PATTERN.test(code)) {
    try {
      valid = await trackReferralClick(code, clientIp(request));
    } catch (error) {
      console.error("[referral] click tracking failed", error);
    }
  }

  if (valid) register.searchParams.set("ref", code);
  const response = NextResponse.redirect(register, { status: 302 });
  if (valid) {
    response.cookies.set({
      name: REFERRAL_COOKIE,
      value: code,
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: getEnv().NODE_ENV === "production",
    });
  }
  return response;
}
