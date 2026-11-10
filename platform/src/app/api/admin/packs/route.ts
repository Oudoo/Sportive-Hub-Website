import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, parseQuery, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { listPacks, sellPack } from "@/lib/services/packs";
import { packsQuerySchema, sellPackSchema } from "@/lib/validation";

/** GET /api/admin/packs?userId=&status=&page=&perPage= — course packs sold, newest first. */
export const GET = route(async (request) => {
  await requireStaff();
  const query = parseQuery(request.nextUrl, packsQuerySchema);
  return ok(await listPacks({ userId: query.userId ?? query.patientId, status: query.status, page: query.page, perPage: query.perPage }));
});

/**
 * POST /api/admin/packs — sells a course pack to a member.
 * Body: { patientId, templateId } or { patientId, name, type, sessions }, plus priceEgp?, paid?, paymentMethod?, expiresInDays?, notes?
 */
export const POST = route(async (request) => {
  const staff = await requireStaff();
  const input = await parseJson(request, sellPackSchema);
  return ok(await sellPack(input, userContext(staff, request)), { status: 201 });
});
