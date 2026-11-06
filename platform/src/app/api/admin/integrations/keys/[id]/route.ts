import { requireAdmin } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { revokeApiKey } from "@/lib/integrations/apikeys";
import { audit } from "@/lib/security/audit";

/** DELETE /api/admin/integrations/keys/:id — revokes the key; the next call with it gets 401. */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const key = await revokeApiKey(id);
  await audit({ action: "apikey.revoked", actor: { type: "USER", id: admin.id }, target: { type: "apikey", id }, request });
  return ok(key);
});
