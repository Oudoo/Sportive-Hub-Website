import { homeFor, issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { systemContext } from "@/lib/security/context";
import { LIMITS, enforceRateLimit } from "@/lib/security/ratelimit";
import { clientIp } from "@/lib/security/request";
import { loginUser } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validation";

/**
 * POST /api/auth/login
 * Body: { email, password, issueToken? }
 *
 * - Password only: sets the HttpOnly session cookie and says where to go next.
 * - Two-factor accounts: returns { twoFactorRequired: true, challenge } and no cookie;
 *   finish with POST /api/auth/login/2fa.
 * - `issueToken: true` also returns the token in the body, for scripts and apps that
 *   send it as `Authorization: Bearer`. Browsers should leave it off.
 */
export const POST = route(async (request) => {
  const ip = clientIp(request);
  if (ip !== "unknown") enforceRateLimit(`login:ip:${ip}`, LIMITS.loginPerIp.limit, LIMITS.loginPerIp.windowMs);

  const input = await parseJson(request, loginSchema);
  const result = await loginUser(input, { ...systemContext, request });

  if (result.twoFactorRequired) {
    return ok({ twoFactorRequired: true, challenge: result.challenge });
  }

  const { user } = result;
  const token = await issueSessionToken(user);
  const response = ok({
    user,
    ...(input.issueToken ? { token } : {}),
    redirectTo: homeFor(user),
  });
  response.cookies.set(sessionCookie(token));
  return response;
});
