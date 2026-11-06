import { ok, parseJson, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { adjustPatientPoints } from "@/lib/services/patients";
import { pointsAdjustSchema } from "@/lib/validation";

/** POST /api/v1/patients/{id}/loyalty/adjust — Body: { points: 10 | -10, note }. Adds or deducts points with a reason. */
export const POST = apiRoute<IdContext>("loyalty:write", async (request, { params }, principal) => {
  const { id } = await params;
  const input = await parseJson(request, pointsAdjustSchema);
  return ok(await adjustPatientPoints(id, input, apiContext(principal, request)));
});
