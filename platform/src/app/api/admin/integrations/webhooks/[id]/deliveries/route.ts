import { requireAdmin } from "@/lib/auth/session";
import { ok, parseQuery, route, type IdContext } from "@/lib/http";
import { listDeliveries } from "@/lib/services/integrations";
import { paginationSchema } from "@/lib/validation";

/** GET /api/admin/integrations/webhooks/:id/deliveries?page= — the delivery log, newest first. */
export const GET = route<IdContext>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { page, perPage } = parseQuery(request.nextUrl, paginationSchema);
  return ok(await listDeliveries(id, page, perPage));
});
