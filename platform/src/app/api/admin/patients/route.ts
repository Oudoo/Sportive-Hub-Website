import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, parseQuery, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createInviteLink } from "@/lib/services/auth";
import { listPatients, upsertPatient } from "@/lib/services/patients";
import { patientsQuerySchema, v1PatientUpsertSchema } from "@/lib/validation";

/** GET /api/admin/patients?q=&page=&perPage= — searchable, paginated patient list. */
export const GET = route(async (request) => {
  await requireStaff();
  const query = parseQuery(request.nextUrl, patientsQuerySchema);
  return ok(await listPatients(query));
});

/**
 * POST /api/admin/patients
 * Body: { fullName, email, phone?, referralCode?, externalSource?, externalId? }
 * Front-desk sign-up: creates (or updates) the patient and returns an invitation link
 * they use to set their own password. Send it on WhatsApp.
 */
export const POST = route(async (request) => {
  const admin = await requireStaff();
  const input = await parseJson(request, v1PatientUpsertSchema);
  const ctx = userContext(admin, request);
  const { patient, created } = await upsertPatient(input, ctx);
  const invite = created || !patient.lastLoginAt ? await createInviteLink(patient.id, ctx) : null;
  return ok({ patient, created, invite }, { status: created ? 201 : 200 });
});
