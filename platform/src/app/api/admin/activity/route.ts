import { requireAdmin } from "@/lib/auth/session";
import { ok, parseQuery, route } from "@/lib/http";
import { ACTIONS } from "@/lib/security/audit";
import { getSecuritySummary, listAuditLogs } from "@/lib/services/audit";
import { auditQuerySchema } from "@/lib/validation";

/** GET /api/admin/activity?action=auth.&actorId=&q=&page= — the audit log and a security summary. */
export const GET = route(async (request) => {
  await requireAdmin();
  const query = parseQuery(request.nextUrl, auditQuerySchema);
  const [log, summary] = await Promise.all([listAuditLogs(query), getSecuritySummary()]);
  return ok({ ...log, summary, actions: ACTIONS });
});
