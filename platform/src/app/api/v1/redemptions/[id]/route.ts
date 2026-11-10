import { ok, parseJson, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { redemptionPayload } from "@/lib/integrations/serializers";
import { apiContext } from "@/lib/security/context";
import { getRedemption, updateRedemptionStatus } from "@/lib/services/rewards";
import { redemptionStatusSchema } from "@/lib/validation";

/** GET /api/v1/redemptions/{id} */
export const GET = apiRoute<IdContext>("loyalty:read", async (_request, { params }) => {
  const { id } = await params;
  return ok({ redemption: redemptionPayload(await getRedemption(id)) });
});

/** PATCH /api/v1/redemptions/{id} — Body: { status: "FULFILLED" | "CANCELLED", note? }. Cancelling refunds the points. */
export const PATCH = apiRoute<IdContext>("loyalty:write", async (request, { params }, principal) => {
  const { id } = await params;
  const input = await parseJson(request, redemptionStatusSchema);
  return ok({ redemption: redemptionPayload(await updateRedemptionStatus(id, input, apiContext(principal, request))) });
});
