import { ok } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { getSettings, promoActive, tierLadder } from "@/lib/loyalty";

/** GET /api/v1/settings — the programme's rules: points per session, bonuses, tiers, promotion. */
export const GET = apiRoute("loyalty:read", async () => {
  const settings = await getSettings();
  return ok({ ...settings, tiers: tierLadder(settings), promoActive: promoActive(settings) });
});
