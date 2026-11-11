import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createTeamMember, listTeam } from "@/lib/services/team";
import { teamCreateSchema } from "@/lib/validation";

/** GET /api/admin/team — admins and staff. */
export const GET = route(async () => {
  await requireAdmin();
  return ok({ items: await listTeam() });
});

/**
 * POST /api/admin/team — Body: { fullName, email, role: "ADMIN" | "STAFF", phone?, preferredBranch? }
 * Creates the account and returns an invitation link for them to set their password.
 */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, teamCreateSchema);
  return ok(await createTeamMember(input, userContext(admin, request)), { status: 201 });
});
