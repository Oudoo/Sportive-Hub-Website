import { requireUser } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { enableTwoFactor } from "@/lib/services/auth";
import { twoFactorEnableSchema } from "@/lib/validation";

/** POST /api/me/2fa/enable — Body: { code }. Confirms the app is set up; returns the recovery codes once. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, twoFactorEnableSchema);
  return ok(await enableTwoFactor(user.id, input.code, userContext(user, request)));
});
