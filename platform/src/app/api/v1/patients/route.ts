import { ok, parseJson, parseQuery } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { patientPayload } from "@/lib/integrations/serializers";
import { getSettings } from "@/lib/loyalty";
import { apiContext } from "@/lib/security/context";
import { createInviteLink } from "@/lib/services/auth";
import { listPatients, upsertPatient } from "@/lib/services/patients";
import { patientsQuerySchema, v1PatientUpsertSchema } from "@/lib/validation";

/** GET /api/v1/patients?q=&page=&perPage= — search by name, email, phone, referral code or external id. */
export const GET = apiRoute("patients:read", async (request) => {
  const query = parseQuery(request.nextUrl, patientsQuerySchema);
  const [settings, result] = await Promise.all([getSettings(), listPatients(query)]);
  return ok({ ...result, items: result.items.map((row) => ({ ...patientPayload(row, settings), sessions: row._count.sessions, referrals: row._count.referrals })) });
});

/**
 * POST /api/v1/patients — create or update.
 * Body: { email, fullName, phone?, externalSource?, externalId?, referralCode?, isActive? }
 * Matched by externalSource + externalId first, then by email. A new patient gets an
 * invitation link in the response: send it to them so they can set a password.
 */
export const POST = apiRoute("patients:write", async (request, _context, principal) => {
  const input = await parseJson(request, v1PatientUpsertSchema);
  const ctx = apiContext(principal, request);
  const [settings, { patient, created }] = await Promise.all([getSettings(), upsertPatient(input, ctx)]);
  const invite = created ? await createInviteLink(patient.id, ctx) : null;
  return ok({ patient: patientPayload(patient, settings), created, invite }, { status: created ? 201 : 200 });
});
