import { requireAdmin } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { listLedger } from "@/lib/services/loyalty-admin";
import { ledgerQuerySchema } from "@/lib/validation";

/** GET /api/admin/loyalty/ledger?reason=&q=&page= — every points movement, newest first. */
export const GET = route(async (request) => {
  await requireAdmin();
  const query = parseQuery(request.nextUrl, ledgerQuerySchema);
  return ok(await listLedger(query));
});
