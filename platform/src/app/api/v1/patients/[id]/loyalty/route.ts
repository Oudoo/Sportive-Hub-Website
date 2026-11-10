import { ok, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { getPatientLoyalty } from "@/lib/services/patients";

/** GET /api/v1/patients/{id}/loyalty — balance, tier, pending vouchers and the last 50 points movements. */
export const GET = apiRoute<IdContext>("loyalty:read", async (_request, { params }) => {
  const { id } = await params;
  return ok(await getPatientLoyalty(id));
});
