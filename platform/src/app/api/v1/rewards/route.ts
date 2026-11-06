import { ok } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { listRewards } from "@/lib/services/rewards";

/** GET /api/v1/rewards — the active rewards catalogue. */
export const GET = apiRoute("loyalty:read", async () => {
  const items = await listRewards({ includeInactive: false });
  return ok({ items: items.map(({ _count, ...reward }) => ({ ...reward, timesRedeemed: _count.redemptions })) });
});
