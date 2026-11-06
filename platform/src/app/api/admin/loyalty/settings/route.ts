import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { getSettings } from "@/lib/loyalty";
import { userContext } from "@/lib/security/context";
import { updateSettings } from "@/lib/services/loyalty-admin";
import { settingsSchema } from "@/lib/validation";

/** GET /api/admin/loyalty/settings — the programme's rules. */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await getSettings());
});

/** PUT /api/admin/loyalty/settings — partial update of the rules; takes effect within seconds. */
export const PUT = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, settingsSchema);
  return ok(await updateSettings(input, userContext(admin, request)));
});
