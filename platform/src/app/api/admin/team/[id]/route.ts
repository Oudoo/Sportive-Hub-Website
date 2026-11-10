import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { updateTeamMember } from "@/lib/services/team";
import { teamUpdateSchema } from "@/lib/validation";

/** PATCH /api/admin/team/:id — Body: { fullName?, role?, isActive?, preferredBranch? } */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseJson(request, teamUpdateSchema);
  return ok(await updateTeamMember(id, input, admin, userContext(admin, request)));
});
