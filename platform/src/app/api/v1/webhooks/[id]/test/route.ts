import { ok, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { testWebhook } from "@/lib/services/integrations";

/** POST /api/v1/webhooks/{id}/test — sends a `webhook.test` event to the endpoint. */
export const POST = apiRoute<IdContext>("webhooks:manage", async (request, { params }, principal) => {
  const { id } = await params;
  return ok(await testWebhook(id, apiContext(principal, request)), { status: 202 });
});
