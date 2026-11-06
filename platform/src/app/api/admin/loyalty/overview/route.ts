import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getLoyaltyOverview } from "@/lib/services/loyalty-admin";

/** GET /api/admin/loyalty/overview — tiers, points issued and redeemed, liability, pending vouchers. */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await getLoyaltyOverview());
});
