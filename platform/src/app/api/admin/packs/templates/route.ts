import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createTemplate, listTemplates } from "@/lib/services/packs";
import { packageTemplateSchema } from "@/lib/validation";

/** GET /api/admin/packs/templates?all=1 — the packs the clinic sells (active only unless all=1). */
export const GET = route(async (request) => {
  await requireStaff();
  return ok({ items: await listTemplates({ includeInactive: request.nextUrl.searchParams.get("all") === "1" }) });
});

/** POST /api/admin/packs/templates — Body: { name, type, sessions, priceEgp?, description?, isActive?, sortOrder? } */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, packageTemplateSchema);
  return ok(await createTemplate(input, userContext(admin, request)), { status: 201 });
});
