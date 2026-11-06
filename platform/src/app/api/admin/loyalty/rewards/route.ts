import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createReward, listRewards } from "@/lib/services/rewards";
import { rewardCreateSchema } from "@/lib/validation";

/** GET /api/admin/loyalty/rewards — the whole catalogue, inactive rewards included. */
export const GET = route(async () => {
  await requireAdmin();
  return ok({ items: await listRewards({ includeInactive: true }) });
});

/** POST /api/admin/loyalty/rewards — Body: { name, description?, kind, value?, cost, minTier?, stock?, isActive?, sortOrder? } */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, rewardCreateSchema);
  return ok(await createReward(input, userContext(admin, request)), { status: 201 });
});
