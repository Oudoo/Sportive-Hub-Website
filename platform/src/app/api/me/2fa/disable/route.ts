import { requireUser } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { disableTwoFactor } from "@/lib/services/auth";
import { twoFactorDisableSchema } from "@/lib/validation";

/** POST /api/me/2fa/disable — Body: { password, code }. Turns two-factor sign-in off. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, twoFactorDisableSchema);
  await disableTwoFactor(user.id, input, userContext(user, request));
  return ok({ ok: true });
});
