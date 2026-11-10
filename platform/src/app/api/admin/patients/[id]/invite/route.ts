import { requireStaff } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createInviteLink } from "@/lib/services/auth";

/**
 * POST /api/admin/patients/:id/invite
 * A one-time link (valid 7 days) the patient opens to set a password. Doubles as the
 * password reset: send it on WhatsApp to a patient who forgot theirs.
 */
export const POST = route<IdContext>(async (request, { params }) => {
  const admin = await requireStaff();
  const { id } = await params;
  return ok(await createInviteLink(id, userContext(admin, request)), { status: 201 });
});
