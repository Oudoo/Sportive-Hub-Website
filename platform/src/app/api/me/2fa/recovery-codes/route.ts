import { requireUser } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { regenerateRecoveryCodes } from "@/lib/services/auth";
import { twoFactorEnableSchema } from "@/lib/validation";

/** POST /api/me/2fa/recovery-codes — Body: { code }. Replaces the recovery codes; returns the new ones once. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, twoFactorEnableSchema);
  return ok(await regenerateRecoveryCodes(user.id, input.code, userContext(user, request)));
});
