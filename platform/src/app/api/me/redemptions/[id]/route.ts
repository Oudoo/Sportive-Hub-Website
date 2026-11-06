import { requireUser } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { cancelOwnRedemption } from "@/lib/services/rewards";

/** DELETE /api/me/redemptions/:id — cancels one of the patient's own pending vouchers; points come back. */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return ok(await cancelOwnRedemption(user.id, id, userContext(user, request)));
});
