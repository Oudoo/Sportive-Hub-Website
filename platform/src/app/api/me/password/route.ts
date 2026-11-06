import { issueSessionToken, requireUser, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { changePassword } from "@/lib/services/auth";
import { passwordChangeSchema } from "@/lib/validation";

/**
 * POST /api/me/password
 * Body: { currentPassword, newPassword }
 * Changes the password and signs out every other device; this one gets a fresh cookie.
 */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, passwordChangeSchema);
  const { sessionVersion } = await changePassword(user.id, input, userContext(user, request));

  const token = await issueSessionToken({ ...user, sessionVersion });
  const response = ok({ ok: true });
  response.cookies.set(sessionCookie(token));
  return response;
});
