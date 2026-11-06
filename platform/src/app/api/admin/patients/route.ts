import { requireAdmin } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { listPatients } from "@/lib/services/patients";
import { patientsQuerySchema } from "@/lib/validation";

/** GET /api/admin/patients?q=&page=&perPage= — searchable, paginated patient list. */
export const GET = route(async (request) => {
  await requireAdmin();
  const query = parseQuery(request.nextUrl, patientsQuerySchema);
  return ok(await listPatients(query));
});
