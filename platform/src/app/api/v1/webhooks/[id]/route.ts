import { ok, parseJson, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { deleteWebhook, updateWebhook } from "@/lib/services/integrations";
import { webhookUpdateSchema } from "@/lib/validation";

/** PATCH /api/v1/webhooks/{id} — partial update; `isActive: false` pauses deliveries. */
export const PATCH = apiRoute<IdContext>("webhooks:manage", async (request, { params }, principal) => {
  const { id } = await params;
  const input = await parseJson(request, webhookUpdateSchema);
  return ok(await updateWebhook(id, input, apiContext(principal, request)));
});

/** DELETE /api/v1/webhooks/{id} */
export const DELETE = apiRoute<IdContext>("webhooks:manage", async (request, { params }, principal) => {
  const { id } = await params;
  await deleteWebhook(id, apiContext(principal, request));
  return ok({ ok: true });
});
