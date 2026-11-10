import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { deleteTemplate, updateTemplate } from "@/lib/services/packs";
import { packageTemplateSchema } from "@/lib/validation";

/** PATCH /api/admin/packs/templates/:id — partial update. */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, packageTemplateSchema.partial());
  return ok(await updateTemplate(id, input, userContext(admin, request)));
});

/** DELETE /api/admin/packs/templates/:id — only while nothing has been sold from it. */
export const DELETE = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteTemplate(id, userContext(admin, request));
  return ok({ ok: true });
});
