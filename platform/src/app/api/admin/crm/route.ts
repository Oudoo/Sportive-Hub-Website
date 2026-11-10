import { requireStaff } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { getRegulars } from "@/lib/services/crm";
import { crmQuerySchema } from "@/lib/validation";

/** GET /api/admin/crm?status=&branch=&q=&page= — regulars and churn risk, with one-tap WhatsApp links per member. */
export const GET = route(async (request) => {
  await requireStaff();
  const query = parseQuery(request.nextUrl, crmQuerySchema);
  return ok(await getRegulars(query));
});
