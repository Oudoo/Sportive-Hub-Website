import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route, type IdContext } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { updatePack } from "@/lib/services/packs";
import { packUpdateSchema } from "@/lib/validation";

/** PATCH /api/admin/packs/:id — Body: { status?, usedSessions?, totalSessions?, expiresAt?, notes? } */
export const PATCH = route<IdContext>(async (request, { params }) => {
  const staff = await requireStaff();
  const { id } = await params;
  const input = await parseJson(request, packUpdateSchema);
  return ok(await updatePack(id, input, userContext(staff, request)));
});
