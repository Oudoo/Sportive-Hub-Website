import { requireAdmin } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { testWebhook } from "@/lib/services/integrations";

/** POST /api/admin/integrations/webhooks/:id/test — sends a `webhook.test` event; check the delivery log for the result. */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  return ok(await testWebhook(id, userContext(admin, request)), { status: 202 });
});
