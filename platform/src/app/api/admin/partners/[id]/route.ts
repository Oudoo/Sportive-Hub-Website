import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { deleteOffer, updateOffer } from "@/lib/services/partners";
import { partnerOfferSchema } from "@/lib/validation";

/** PATCH /api/admin/partners/:id — partial update. */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, partnerOfferSchema.partial());
  return ok(await updateOffer(id, input, userContext(admin, request)));
});

/** DELETE /api/admin/partners/:id — removes the offer and its coupons. */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteOffer(id, userContext(admin, request));
  return ok({ ok: true });
});
