import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { getPatient, updatePatient } from "@/lib/services/patients";
import { patientUpdateSchema } from "@/lib/validation";

/** GET /api/admin/patients/:id — profile, referrer, referrals, recent sessions and points history. */
export const GET = route<IdContext>(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  return ok(await getPatient(id));
});

/** PATCH /api/admin/patients/:id — Body: { fullName?, phone?, isActive? } */
export const PATCH = route<IdContext>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, patientUpdateSchema);
  return ok(await updatePatient(id, input));
});
