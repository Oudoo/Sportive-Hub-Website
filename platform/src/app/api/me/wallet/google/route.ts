import { requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { googleWalletLink } from "@/lib/services/wallet";

/** POST /api/me/wallet/google — a "Save to Google Wallet" link for this member's pass. 404 until the clinic adds its Google Wallet issuer. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const url = await googleWalletLink(user, userContext(user, request));
  return ok({ url });
});
