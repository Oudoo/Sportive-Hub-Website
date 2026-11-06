import { requireUser } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { startTwoFactorSetup } from "@/lib/services/auth";

/** POST /api/me/2fa/setup — starts two-factor setup: returns the secret, otpauth URI and a QR code (SVG). */
export const POST = route(async () => {
  const user = await requireUser();
  return ok(await startTwoFactorSetup(user));
});
