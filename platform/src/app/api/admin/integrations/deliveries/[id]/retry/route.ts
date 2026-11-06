import { requireAdmin } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { retryWebhookDelivery } from "@/lib/services/integrations";

/** POST /api/admin/integrations/deliveries/:id/retry — sends a failed delivery again. */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await retryWebhookDelivery(id, userContext(admin, request));
  return ok({ ok: true }, { status: 202 });
});
