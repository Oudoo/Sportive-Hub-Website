import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { getPatient, updatePatient } from "@/lib/services/patients";
import { patientUpdateSchema } from "@/lib/validation";

/** GET /api/admin/patients/:id — profile, referrer, referrals, sessions, vouchers, points history, security state. */
export const GET = route<IdContext>(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  return ok(await getPatient(id));
});

/** PATCH /api/admin/patients/:id — Body: { fullName?, phone?, isActive?, externalSource?, externalId? } */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, patientUpdateSchema);
  return ok(await updatePatient(id, input, userContext(admin, request)));
});
