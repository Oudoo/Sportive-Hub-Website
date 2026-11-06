import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, parseQuery, route } from "@/lib/http";
import { createSession, listSessions } from "@/lib/services/sessions";
import { sessionCreateSchema, sessionsQuerySchema } from "@/lib/validation";

/** GET /api/admin/sessions?status=&patientId=&upcoming=1&page=&perPage= */
export const GET = route(async (request) => {
  await requireAdmin();
  const query = parseQuery(request.nextUrl, sessionsQuerySchema);
  return ok(await listSessions(query));
});

/**
 * POST /api/admin/sessions
 * Body: { patientId, type, branch?, title?, startsAt, durationMinutes?, practitioner?, notes?, isComplimentary? }
 */
export const POST = route(async (request) => {
  await requireAdmin();
  const input = await parseJson(request, sessionCreateSchema);
  const session = await createSession(input);
  return ok(session, { status: 201 });
});
