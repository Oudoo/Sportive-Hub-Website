import { ok } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { clientIp } from "@/lib/security/request";

/** GET /api/v1/ping — checks the key and reports its permissions. The first call every integration should make. */
export const GET = apiRoute(null, async (request, _context, principal) => {
  return ok({ ok: true, key: { id: principal.id, name: principal.name, scopes: principal.scopes }, clientIp: clientIp(request), time: new Date().toISOString() });
});
