import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, parseQuery, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createSession, listSessions } from "@/lib/services/sessions";
import { sessionCreateSchema, sessionsQuerySchema } from "@/lib/validation";

/** GET /api/admin/sessions?status=&patientId=&upcoming=1&from=&to=&page=&perPage= */
export const GET = route(async (request) => {
  await requireAdmin();
  const query = parseQuery(request.nextUrl, sessionsQuerySchema);
  return ok(await listSessions(query));
});

/**
 * POST /api/admin/sessions
 * Body: { patientId, type, branch?, title?, startsAt, durationMinutes?, practitioner?, notes?, isComplimentary?, status? }
 */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, sessionCreateSchema);
  return ok(await createSession(input, userContext(admin, request)), { status: 201 });
});
