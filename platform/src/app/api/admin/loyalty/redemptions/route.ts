import { requireAdmin } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { listRedemptions } from "@/lib/services/rewards";
import { redemptionsQuerySchema } from "@/lib/validation";

/** GET /api/admin/loyalty/redemptions?status=&q=&patientId=&page= — vouchers, newest first. `q` matches a voucher code or a patient. */
export const GET = route(async (request) => {
  await requireAdmin();
  const query = parseQuery(request.nextUrl, redemptionsQuerySchema);
  return ok(await listRedemptions(query));
});
