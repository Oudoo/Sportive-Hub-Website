import { HttpError, ok, parseJson, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { patientPayload } from "@/lib/integrations/serializers";
import { getSettings } from "@/lib/loyalty";
import { apiContext } from "@/lib/security/context";
import { lookupPatient, updatePatient } from "@/lib/services/patients";
import { prisma } from "@/lib/db";
import { safeUserSelect } from "@/lib/serialize";
import { patientUpdateSchema } from "@/lib/validation";

/** GET /api/v1/patients/{id} — by our id, or by `ext:<source>:<externalId>`. */
export const GET = apiRoute<IdContext>("patients:read", async (_request, { params }) => {
  const { id } = await params;
  const settings = await getSettings();
  if (id.startsWith("ext:")) {
    const [, externalSource, ...rest] = id.split(":");
    const patient = await lookupPatient({ externalSource, externalId: rest.join(":") });
    return ok({ patient: patientPayload(patient, settings) });
  }
  const patient = await prisma.user.findFirst({ where: { id, role: "PATIENT" }, select: safeUserSelect });
  if (!patient) throw new HttpError(404, "Patient not found");
  return ok({ patient: patientPayload(patient, settings) });
});

/** PATCH /api/v1/patients/{id} — Body: { fullName?, phone?, isActive?, externalSource?, externalId? } */
export const PATCH = apiRoute<IdContext>("patients:write", async (request, { params }, principal) => {
  const { id } = await params;
  const input = await parseJson(request, patientUpdateSchema);
  const [settings, patient] = await Promise.all([getSettings(), updatePatient(id, input, apiContext(principal, request))]);
  return ok({ patient: patientPayload(patient, settings) });
});
