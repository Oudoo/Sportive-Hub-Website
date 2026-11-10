import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { deleteUpdate, updateUpdate } from "@/lib/services/updates";
import { updateUpdateSchema } from "@/lib/validation";

/** PUT /api/admin/updates/:id — partial update; `publish: true|false` publishes or unpublishes. */
export const PUT = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, updateUpdateSchema);
  return ok(await updateUpdate(id, input, userContext(admin, request)));
});

/** DELETE /api/admin/updates/:id */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteUpdate(id, userContext(admin, request));
  return ok({ ok: true });
});
