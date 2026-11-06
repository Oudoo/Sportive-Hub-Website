import { requireAdmin } from "@/lib/auth/session";
import { ok, route } from "@/lib/http";
import { getOverview } from "@/lib/services/overview";

/** GET /api/admin/overview — headline metrics for the dashboard. */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await getOverview());
});
