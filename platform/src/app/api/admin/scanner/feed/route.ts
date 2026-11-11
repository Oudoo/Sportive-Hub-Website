import { requireStaff } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { getFeed } from "@/lib/services/scanner";
import { feedQuerySchema } from "@/lib/validation";

/** GET /api/admin/scanner/feed?branch= — members who checked in and are waiting, plus the last 24 hours of scanner actions with undo flags. */
export const GET = route(async (request) => {
  await requireStaff();
  const query = parseQuery(request.nextUrl, feedQuerySchema);
  return ok(await getFeed({ branch: query.branch }));
});
