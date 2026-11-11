import { requireStaff } from "@/lib/auth/session";
import { ok, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { undoAction } from "@/lib/services/scanner";

/** POST /api/admin/scanner/undo/:auditId — reverses one scanner action (session, points, stamp, pack, referral, payment or coupon) within 24 hours. */
export const POST = route<IdContext>(async (request, { params }) => {
  const staff = await requireStaff();
  const { id } = await params;
  return ok(await undoAction(id, staff, userContext(staff, request)));
});
