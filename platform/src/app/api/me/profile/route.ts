import { requireUser } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { updateProfile } from "@/lib/services/members";
import { profileUpdateSchema } from "@/lib/validation";

/** PATCH /api/me/profile — Body: { fullName?, phone?, email?, preferredBranch? } */
export const PATCH = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, profileUpdateSchema);
  return ok(await updateProfile(user.id, input, userContext(user, request)));
});
