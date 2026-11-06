import { clearedSessionCookie, requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { revokeAllSessions } from "@/lib/services/auth";

/** POST /api/me/sessions/revoke — signs the user out of every device, this one included. */
export const POST = route(async (request) => {
  const user = await requireUser();
  await revokeAllSessions(user.id, userContext(user, request));
  const response = ok({ ok: true, redirectTo: "/login" });
  response.cookies.set(clearedSessionCookie());
  return response;
});
