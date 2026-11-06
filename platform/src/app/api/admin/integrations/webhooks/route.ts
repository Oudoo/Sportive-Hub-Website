import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { WEBHOOK_EVENTS } from "@/lib/integrations/events";
import { userContext } from "@/lib/security/context";
import { createWebhook, listWebhooks } from "@/lib/services/integrations";
import { webhookCreateSchema } from "@/lib/validation";

/** GET /api/admin/integrations/webhooks — endpoints with their last delivery, plus the event catalogue. */
export const GET = route(async () => {
  await requireAdmin();
  return ok({ items: await listWebhooks(), events: WEBHOOK_EVENTS });
});

/** POST /api/admin/integrations/webhooks — Body: { name, url, events[], description?, isActive? }. The signing secret is in the response once. */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, webhookCreateSchema);
  return ok(await createWebhook(input, userContext(admin, request)), { status: 201 });
});
