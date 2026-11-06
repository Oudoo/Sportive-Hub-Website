import { clearedSessionCookie } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";

/** POST /api/auth/logout — expires the session cookie. */
export const POST = route(async () => {
  const response = ok({ ok: true });
  response.cookies.set(clearedSessionCookie());
  return response;
});
