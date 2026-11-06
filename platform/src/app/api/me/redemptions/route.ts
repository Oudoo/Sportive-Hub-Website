import { requireUser } from "@/lib/auth/session";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { redeemReward } from "@/lib/services/rewards";
import { redeemSchema } from "@/lib/validation";

/**
 * POST /api/me/redemptions
 * Body: { rewardId }
 * Spends the patient's points and returns the voucher to show at the front desk.
 */
export const POST = route(async (request) => {
  const user = await requireUser();
  if (user.role !== "PATIENT") throw new HttpError(403, "Only patient accounts collect points");
  const input = await parseJson(request, redeemSchema);
  const result = await redeemReward({ userId: user.id, rewardId: input.rewardId }, userContext(user, request));
  return ok(result, { status: 201 });
});
