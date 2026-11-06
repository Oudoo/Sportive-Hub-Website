import { ok, parseJson } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { WEBHOOK_EVENTS } from "@/lib/integrations/events";
import { apiContext } from "@/lib/security/context";
import { createWebhook, listWebhooks } from "@/lib/services/integrations";
import { webhookCreateSchema } from "@/lib/validation";

/** GET /api/v1/webhooks — your endpoints and the event catalogue. */
export const GET = apiRoute("webhooks:manage", async () => {
  return ok({ items: await listWebhooks(), events: WEBHOOK_EVENTS });
});

/** POST /api/v1/webhooks — Body: { name, url, events[], description? }. The signing secret is returned once. */
export const POST = apiRoute("webhooks:manage", async (request, _context, principal) => {
  const input = await parseJson(request, webhookCreateSchema);
  return ok(await createWebhook(input, apiContext(principal, request)), { status: 201 });
});
