import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getReferralOverview } from "@/lib/services/referrals";

/** GET /api/admin/loyalty/referrals — funnel, leaderboard and recent referrals. */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await getReferralOverview());
});
