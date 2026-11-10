import { ok, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { retryWebhookDelivery } from "@/lib/services/integrations";

/** POST /api/v1/webhooks/deliveries/{id}/retry — sends a failed delivery again. */
export const POST = apiRoute<IdContext>("webhooks:manage", async (request, { params }, principal) => {
  const { id } = await params;
  await retryWebhookDelivery(id, apiContext(principal, request));
  return ok({ ok: true }, { status: 202 });
});
