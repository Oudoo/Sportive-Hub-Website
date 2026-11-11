import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { deleteSession, getSession, updateSession } from "@/lib/services/sessions";
import { sessionUpdateSchema } from "@/lib/validation";

/** GET /api/admin/sessions/:id */
export const GET = route<IdContext>(async (_request, { params }) => {
  await requireStaff();
  const { id } = await params;
  return ok(await getSession(id));
});

/**
 * PUT /api/admin/sessions/:id — partial update. Setting `status: "COMPLETED"`
 * awards attendance points to the patient the first time (tier and promotion included).
 */
export const PUT = route<IdContext>(async (request, { params }) => {
  const staff = await requireStaff();
  const { id } = await params;
  const input = await parseJson(request, sessionUpdateSchema);
  return ok(await updateSession(id, input, userContext(staff, request)));
});

/** DELETE /api/admin/sessions/:id */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteSession(id, userContext(admin, request));
  return ok({ ok: true });
});
