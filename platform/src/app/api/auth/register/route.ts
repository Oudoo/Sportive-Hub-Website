import { issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { REFERRAL_COOKIE, referralLink } from "@/lib/referral";
import { systemContext } from "@/lib/security/context";
import { LIMITS, enforceRateLimit } from "@/lib/security/ratelimit";
import { clientIp } from "@/lib/security/request";
import { registerPatient } from "@/lib/services/auth";
import { registerSchema } from "@/lib/validation";

/**
 * POST /api/auth/register
 * Body: { fullName, email, password, phone?, referralCode? }
 * Creates a patient, applies the referral if a code was given, and signs them in.
 */
export const POST = route(async (request) => {
  const ip = clientIp(request);
  if (ip !== "unknown") enforceRateLimit(`register:${ip}`, LIMITS.registerPerIp.limit, LIMITS.registerPerIp.windowMs);

  const input = await parseJson(request, registerSchema);
  const user = await registerPatient(input, { ...systemContext, request });

  const token = await issueSessionToken(user);
  const response = ok(
    {
      user,
      referralLink: user.referralCode ? referralLink(user.referralCode) : null,
      redirectTo: "/portal",
    },
    { status: 201 },
  );
  response.cookies.set(sessionCookie(token));
  // The referral cookie (set by /r/CODE) has done its job.
  response.cookies.set({ name: REFERRAL_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
});
