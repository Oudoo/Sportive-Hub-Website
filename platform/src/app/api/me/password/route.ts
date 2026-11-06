import { requireUser } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { changePassword } from "@/lib/services/auth";
import { passwordChangeSchema } from "@/lib/validation";

/**
 * POST /api/me/password
 * Body: { currentPassword, newPassword }
 * Changes the signed-in user's own password. 422 if the current password is wrong.
 */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, passwordChangeSchema);
  await changePassword(user.id, input);
  return ok({ ok: true });
});
