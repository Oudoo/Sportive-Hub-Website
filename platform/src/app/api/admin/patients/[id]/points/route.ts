import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { adjustPatientPoints } from "@/lib/services/patients";
import { pointsAdjustSchema } from "@/lib/validation";

/**
 * POST /api/admin/patients/:id/points
 * Body: { points: 10 | -10, note: "why" }
 * Manually adds or deducts points. The admin and the note are kept in the audit trail.
 */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, pointsAdjustSchema);
  return ok(await adjustPatientPoints(id, input, userContext(admin, request)));
});
