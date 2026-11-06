import { requireUser } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { getActivityPageData } from "@/lib/services/portal";
import { paginationSchema } from "@/lib/validation";

/** GET /api/me/activity?page=1 — the patient's full points history. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request.nextUrl, paginationSchema);
  return ok(await getActivityPageData(user, query.page, query.perPage));
});
