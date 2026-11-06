import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { redeemReward } from "@/lib/services/rewards";
import { adminRedeemSchema } from "@/lib/validation";

/**
 * POST /api/admin/patients/:id/redeem
 * Body: { rewardId, note? }
 * Redeems at the front desk: points are deducted and the voucher is marked fulfilled at once.
 */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, adminRedeemSchema);
  return ok(await redeemReward({ userId: id, rewardId: input.rewardId, note: input.note }, userContext(admin, request)), { status: 201 });
});
