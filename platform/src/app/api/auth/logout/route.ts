import { clearedSessionCookie, getSessionUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { audit } from "@/lib/security/audit";

/** POST /api/auth/logout — expires the session cookie on this device. */
export const POST = route(async (request) => {
  const user = await getSessionUser();
  if (user) await audit({ action: "auth.logout", actor: { type: "USER", id: user.id }, request });
  const response = ok({ ok: true });
  response.cookies.set(clearedSessionCookie());
  return response;
});
