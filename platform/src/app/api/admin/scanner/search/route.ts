import { requireStaff } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { searchMembers } from "@/lib/services/scanner";
import { memberSearchSchema } from "@/lib/validation";

/** GET /api/admin/scanner/search?q= — members by name, phone, code or email, for the manual fallback. */
export const GET = route(async (request) => {
  await requireStaff();
  const { q } = parseQuery(request.nextUrl, memberSearchSchema);
  return ok({ items: await searchMembers(q) });
});
