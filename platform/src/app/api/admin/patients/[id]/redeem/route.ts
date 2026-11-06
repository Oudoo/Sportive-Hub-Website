import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { redeemPatientReward } from "@/lib/services/patients";
import { redeemSchema } from "@/lib/validation";

/**
 * POST /api/admin/patients/:id/redeem
 * Body: { reward: "FREE_SESSION" }
 * Spends the reward's cost from the patient's balance (409 if they cannot afford it).
 */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { reward } = await parseJson(request, redeemSchema);
  return ok(await redeemPatientReward(id, reward, admin.id));
});
