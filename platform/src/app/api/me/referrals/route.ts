import { requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getReferPageData } from "@/lib/services/portal";

/** GET /api/me/referrals — code, link, ready-made message, friends and what they earned. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getReferPageData(user));
});
