import { ok, parseJson, parseQuery } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { sessionPayload } from "@/lib/integrations/serializers";
import { apiContext } from "@/lib/security/context";
import { listSessions, upsertExternalSession } from "@/lib/services/sessions";
import { sessionsQuerySchema, v1SessionUpsertSchema } from "@/lib/validation";

/** GET /api/v1/sessions?patientId=&status=&from=&to=&externalSource=&page=&perPage= */
export const GET = apiRoute("sessions:read", async (request) => {
  const query = parseQuery(request.nextUrl, sessionsQuerySchema);
  const result = await listSessions(query);
  return ok({ ...result, items: result.items.map(sessionPayload) });
});

/**
 * POST /api/v1/sessions — create or update an appointment from another system.
 * Body: { patientId | patientEmail | (externalSource + patientExternalId), type | service, startsAt,
 *         branch?, durationMinutes?, practitioner?, title?, notes?, status?, externalSource?, externalId? }
 * With externalSource + externalId the call is idempotent: the same appointment sent twice
 * updates rather than duplicates. `status: "COMPLETED"` awards the patient's points.
 */
export const POST = apiRoute("sessions:write", async (request, _context, principal) => {
  const input = await parseJson(request, v1SessionUpsertSchema);
  const { session, created } = await upsertExternalSession(input, apiContext(principal, request));
  return ok({ session: sessionPayload(session), created }, { status: created ? 201 : 200 });
});
