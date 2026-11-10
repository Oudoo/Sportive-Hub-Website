import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { deleteWebhook, updateWebhook } from "@/lib/services/integrations";
import { webhookUpdateSchema } from "@/lib/validation";

/** PATCH /api/admin/integrations/webhooks/:id — partial update (pause with `isActive: false`). */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, webhookUpdateSchema);
  return ok(await updateWebhook(id, input, userContext(admin, request)));
});

/** DELETE /api/admin/integrations/webhooks/:id — removes the endpoint and its delivery log. */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteWebhook(id, userContext(admin, request));
  return ok({ ok: true });
});
