import { issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { loginUser } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validation";

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets the HttpOnly session cookie and tells the client where to go next.
 * The token is also returned for non-browser clients, which send it as `Authorization: Bearer`.
 */
export const POST = route(async (request) => {
  const input = await parseJson(request, loginSchema);
  const user = await loginUser(input);

  const token = await issueSessionToken(user);
  const response = ok({
    user,
    token,
    redirectTo: user.role === "ADMIN" ? "/admin" : "/portal",
  });
  response.cookies.set(sessionCookie(token));
  return response;
});
