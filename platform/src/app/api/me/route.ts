import { requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getPortalData } from "@/lib/services/portal";

/**
 * GET /api/me — everything the patient portal shows: profile, points, tier,
 * referral code and link, upcoming sessions, recent points history and latest updates.
 */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getPortalData(user));
});
