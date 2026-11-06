import { ok, parseQuery, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { listDeliveries } from "@/lib/services/integrations";
import { paginationSchema } from "@/lib/validation";

/** GET /api/v1/webhooks/{id}/deliveries?page= — the delivery log with response codes and errors. */
export const GET = apiRoute<IdContext>("webhooks:manage", async (request, { params }) => {
  const { id } = await params;
  const { page, perPage } = parseQuery(request.nextUrl, paginationSchema);
  return ok(await listDeliveries(id, page, perPage));
});
