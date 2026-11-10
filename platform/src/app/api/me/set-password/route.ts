import { issueSessionToken, requireUser, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { LIMITS, enforceRateLimit } from "@/lib/security/ratelimit";
import { setMemberPassword } from "@/lib/services/members";
import { setPasswordSchema } from "@/lib/validation";

/**
 * POST /api/me/set-password — Body: { email, password }
 * A member who joined with a phone number adds an email and password, so they can also
 * sign in the usual way. Other devices are signed out; this one gets a fresh cookie.
 */
export const POST = route(async (request) => {
  const user = await requireUser();
  enforceRateLimit(`setpw:${user.id}`, LIMITS.passwordChangePerUser.limit, LIMITS.passwordChangePerUser.windowMs);
  const input = await parseJson(request, setPasswordSchema);
  const { sessionVersion } = await setMemberPassword(user.id, input, userContext(user, request));
  const token = await issueSessionToken({ ...user, sessionVersion });
  const response = ok({ ok: true });
  response.cookies.set(sessionCookie(token));
  return response;
});
