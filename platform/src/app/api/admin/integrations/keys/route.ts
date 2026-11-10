import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { API_SCOPES, createApiKey, listApiKeys } from "@/lib/integrations/apikeys";
import { audit } from "@/lib/security/audit";
import { apiKeyCreateSchema } from "@/lib/validation";

/** GET /api/admin/integrations/keys — every key (never the key itself) and the available scopes. */
export const GET = route(async () => {
  await requireAdmin();
  return ok({ items: await listApiKeys(), scopes: API_SCOPES });
});

/** POST /api/admin/integrations/keys — Body: { name, scopes[], expiresInDays? }. The key is in the response once. */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, apiKeyCreateSchema);
  const result = await createApiKey({ ...input, createdById: admin.id });
  await audit({ action: "apikey.created", actor: { type: "USER", id: admin.id }, target: { type: "apikey", id: result.apiKey.id }, request, meta: { name: input.name, scopes: result.apiKey.scopes } });
  return ok(result, { status: 201 });
});
