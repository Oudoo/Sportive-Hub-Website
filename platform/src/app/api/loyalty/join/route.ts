import { issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { MEMBER_SESSION_TTL_SECONDS } from "@/lib/auth/token";
import { ok, parseJson, route } from "@/lib/http";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/lib/referral";
import { systemContext } from "@/lib/security/context";
import { LIMITS, enforceRateLimit } from "@/lib/security/ratelimit";
import { clientIp } from "@/lib/security/request";
import { joinMember } from "@/lib/services/members";
import { joinSchema } from "@/lib/validation";

/**
 * POST /api/loyalty/join — passwordless membership from the website, the pain map or a counter QR.
 * Body: { fullName, phone, email?, referralCode?, focusArea?, preferredBranch?, source? }
 * Signs the new member in on this phone (a long session, like a wallet pass) and returns
 * their wallet link, which they can keep or get re-sent by the front desk.
 */
export const POST = route(async (request) => {
  const ip = clientIp(request);
  if (ip !== "unknown") enforceRateLimit(`join:${ip}`, LIMITS.registerPerIp.limit, LIMITS.registerPerIp.windowMs);

  const input = await parseJson(request, joinSchema);
  const cookieCode = request.cookies.get(REFERRAL_COOKIE)?.value;
  const referralCode = input.referralCode ?? (cookieCode ? normalizeReferralCode(cookieCode) : undefined);
  const { user, link } = await joinMember({ ...input, referralCode }, { ...systemContext, request });

  const token = await issueSessionToken(user, MEMBER_SESSION_TTL_SECONDS);
  const response = ok({ user, link, redirectTo: "/portal/wallet" }, { status: 201 });
  response.cookies.set(sessionCookie(token, MEMBER_SESSION_TTL_SECONDS));
  response.cookies.set({ name: REFERRAL_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
});
