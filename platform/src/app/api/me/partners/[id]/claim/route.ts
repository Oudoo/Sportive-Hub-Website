import { requireUser } from "@/lib/auth/session";
import { HttpError, ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { claimPartnerOffer } from "@/lib/services/wallet";

/** POST /api/me/partners/:id/claim — takes a coupon for a partner perk. Idempotent: the same coupon comes back on a second call. */
export const POST = route<IdContext>(async (request, { params }) => {
  const user = await requireUser();
  if (user.role !== "PATIENT") throw new HttpError(403, "Only members claim partner offers");
  const { id } = await params;
  const claim = await claimPartnerOffer(user, id, userContext(user, request));
  return ok({ claim: { id: claim.id, code: claim.code, status: claim.status, expiresAt: claim.expiresAt, offer: { id: claim.offer.id, partnerName: claim.offer.partnerName, title: claim.offer.title, badge: claim.offer.badge, terms: claim.offer.terms } } }, { status: 201 });
});
