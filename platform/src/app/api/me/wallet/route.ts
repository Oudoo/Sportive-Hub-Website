import { requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getWalletData } from "@/lib/services/wallet";

/**
 * GET /api/me/wallet — everything on the member's wallet: the QR, points and tier, the
 * stamp card, course packs, vouchers, rewards, partner perks, referral link and the
 * state of the Google Wallet pass and push notifications.
 */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getWalletData(user));
});
