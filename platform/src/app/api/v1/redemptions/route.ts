import { z } from "zod";
import { ok, parseJson, parseQuery } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { redemptionPayload } from "@/lib/integrations/serializers";
import { apiContext } from "@/lib/security/context";
import { listRedemptions, redeemReward } from "@/lib/services/rewards";
import { adminRedeemSchema, redemptionsQuerySchema } from "@/lib/validation";

/** GET /api/v1/redemptions?status=PENDING&q=<voucher code>&patientId=&page= */
export const GET = apiRoute("loyalty:read", async (request) => {
  const query = parseQuery(request.nextUrl, redemptionsQuerySchema);
  const result = await listRedemptions(query);
  return ok({ ...result, items: result.items.map(redemptionPayload) });
});

/** POST /api/v1/redemptions — Body: { patientId, rewardId, note? }. Spends points and issues a voucher. */
export const POST = apiRoute("loyalty:write", async (request, _context, principal) => {
  const input = await parseJson(request, adminRedeemSchema.extend({ patientId: z.string().min(1) }));
  const result = await redeemReward({ userId: input.patientId, rewardId: input.rewardId, note: input.note }, apiContext(principal, request));
  return ok({ redemption: redemptionPayload(result.redemption), balance: result.balance }, { status: 201 });
});
