import { requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getRewardsPageData } from "@/lib/services/portal";

/** GET /api/me/rewards — the catalogue with eligibility for this patient, and their vouchers. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getRewardsPageData(user));
});
