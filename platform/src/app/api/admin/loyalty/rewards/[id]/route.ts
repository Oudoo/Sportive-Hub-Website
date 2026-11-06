import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { deleteReward, updateReward } from "@/lib/services/rewards";
import { rewardUpdateSchema } from "@/lib/validation";

/** PATCH /api/admin/loyalty/rewards/:id — partial update, including `isActive` to hide or show it. */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, rewardUpdateSchema);
  return ok(await updateReward(id, input, userContext(admin, request)));
});

/** DELETE /api/admin/loyalty/rewards/:id — only for rewards nobody has redeemed yet. */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteReward(id, userContext(admin, request));
  return ok({ ok: true });
});
