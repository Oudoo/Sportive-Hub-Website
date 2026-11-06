import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { resetTwoFactorByStaff, revokeAllSessions } from "@/lib/services/auth";
import { unlockPatient } from "@/lib/services/patients";

const schema = z.object({ action: z.enum(["unlock", "reset-2fa", "sign-out-everywhere"]) });

/**
 * POST /api/admin/patients/:id/security
 * Body: { action: "unlock" | "reset-2fa" | "sign-out-everywhere" }
 * Front-desk fixes for a patient who is locked out, lost their authenticator, or lost a phone.
 */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { action } = await parseJson(request, schema);
  const ctx = userContext(admin, request);

  if (action === "unlock") await unlockPatient(id, ctx);
  else if (action === "reset-2fa") await resetTwoFactorByStaff(id, ctx);
  else await revokeAllSessions(id, ctx);

  return ok({ ok: true });
});
