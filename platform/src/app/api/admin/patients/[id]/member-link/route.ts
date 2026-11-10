import { requireStaff } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createMemberLink } from "@/lib/services/members";

/** POST /api/admin/patients/:id/member-link — a fresh wallet link (valid a year) to send the member on WhatsApp. */
export const POST = route<IdContext>(async (request, { params }) => {
  const staff = await requireStaff();
  const { id } = await params;
  return ok(await createMemberLink(id, userContext(staff, request)), { status: 201 });
});
