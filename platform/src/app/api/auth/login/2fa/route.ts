import { homeFor, issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { systemContext } from "@/lib/security/context";
import { completeTwoFactorLogin } from "@/lib/services/auth";
import { twoFactorLoginSchema } from "@/lib/validation";

/**
 * POST /api/auth/login/2fa
 * Body: { challenge, code, issueToken? }
 * Second step of sign-in: the challenge from /api/auth/login plus a code from the
 * authenticator app (or a recovery code). Sets the session cookie on success.
 */
export const POST = route(async (request) => {
  const input = await parseJson(request, twoFactorLoginSchema);
  const user = await completeTwoFactorLogin(input, { ...systemContext, request });

  const token = await issueSessionToken(user);
  const response = ok({
    user,
    ...(input.issueToken ? { token } : {}),
    redirectTo: homeFor(user),
  });
  response.cookies.set(sessionCookie(token));
  return response;
});
