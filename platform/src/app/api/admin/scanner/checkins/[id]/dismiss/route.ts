import { requireStaff } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { dismissCheckIn } from "@/lib/services/scanner";

/** POST /api/admin/scanner/checkins/:id/dismiss — clears a waiting check-in without logging a session. */
export const POST = route<IdContext>(async (request, { params }) => {
  const staff = await requireStaff();
  const { id } = await params;
  await dismissCheckIn(id, userContext(staff, request));
  return ok({ ok: true });
});
