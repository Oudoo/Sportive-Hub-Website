import { ok, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { createInviteLink } from "@/lib/services/auth";

/** POST /api/v1/patients/{id}/invite — a one-time link (7 days) for the patient to set their password. */
export const POST = apiRoute<IdContext>("patients:write", async (request, { params }, principal) => {
  const { id } = await params;
  return ok(await createInviteLink(id, apiContext(principal, request)), { status: 201 });
});
