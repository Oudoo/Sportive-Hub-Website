import { ok, route } from "@/lib/http";
import { WEBHOOK_EVENTS } from "@/lib/integrations/events";
import { WEBHOOK_USER_AGENT } from "@/lib/integrations/webhooks";

export const dynamic = "force-dynamic";

/** GET /api/v1/events — the webhook event catalogue and how deliveries are signed. Public. */
export const GET = route(async () => {
  return ok({
    events: WEBHOOK_EVENTS,
    delivery: {
      method: "POST",
      userAgent: WEBHOOK_USER_AGENT,
      headers: ["X-SportiveHub-Event", "X-SportiveHub-Delivery", "X-SportiveHub-Timestamp", "X-SportiveHub-Signature"],
      signature: "X-SportiveHub-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of \"<t>.<raw body>\" with the webhook secret>",
      retries: "3 attempts (immediately, after 3 s, after 15 s); failures can be retried from the dashboard or PATCH /api/v1/webhooks/deliveries/{id}/retry",
    },
  });
});
