import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { getRedemption, updateRedemptionStatus } from "@/lib/services/rewards";
import { redemptionStatusSchema } from "@/lib/validation";

/** GET /api/admin/loyalty/redemptions/:id */
export const GET = route<IdContext>(async (_request, { params }) => {
  await requireStaff();
  const { id } = await params;
  return ok(await getRedemption(id));
});

/** PATCH /api/admin/loyalty/redemptions/:id — Body: { status: "FULFILLED" | "CANCELLED", note? }. Cancelling refunds the points. */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireStaff();
  const { id } = await params;
  const input = await parseJson(request, redemptionStatusSchema);
  return ok(await updateRedemptionStatus(id, input, userContext(admin, request)));
});
