import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createOffer, listOffers } from "@/lib/services/partners";
import { partnerOfferSchema } from "@/lib/validation";

/** GET /api/admin/partners?all=1 — partner perks (active only unless all=1). */
export const GET = route(async (request) => {
  await requireStaff();
  return ok({ items: await listOffers({ includeInactive: request.nextUrl.searchParams.get("all") === "1" }) });
});

/** POST /api/admin/partners — Body: { partnerName, zone?, kind?, title, badge?, description?, terms?, emoji?, url?, minTier?, isActive?, sortOrder?, validUntil? } */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, partnerOfferSchema);
  return ok(await createOffer(input, userContext(admin, request)), { status: 201 });
});
