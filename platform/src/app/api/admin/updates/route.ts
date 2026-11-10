import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, parseQuery, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createUpdate, listUpdates } from "@/lib/services/updates";
import { paginationSchema, updateCreateSchema } from "@/lib/validation";

/** GET /api/admin/updates — drafts and published, newest first. */
export const GET = route(async (request) => {
  await requireAdmin();
  const { page, perPage } = parseQuery(request.nextUrl, paginationSchema);
  return ok(await listUpdates({ publishedOnly: false, page, perPage }));
});

/** POST /api/admin/updates — Body: { kind?, title, body, publish? } */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, updateCreateSchema);
  return ok(await createUpdate(input, userContext(admin, request)), { status: 201 });
});
