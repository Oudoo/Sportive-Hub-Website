import { ok, parseQuery } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { patientPayload } from "@/lib/integrations/serializers";
import { getSettings } from "@/lib/loyalty";
import { lookupPatient } from "@/lib/services/patients";
import { v1PatientLookupSchema } from "@/lib/validation";

/** GET /api/v1/patients/lookup?email= | ?phone= | ?referralCode= | ?externalSource=&externalId= — exactly one patient, or 404. */
export const GET = apiRoute("patients:read", async (request) => {
  const query = parseQuery(request.nextUrl, v1PatientLookupSchema);
  const [settings, patient] = await Promise.all([getSettings(), lookupPatient(query)]);
  return ok({ patient: patientPayload(patient, settings) });
});
