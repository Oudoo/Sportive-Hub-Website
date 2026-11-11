import { requireAdmin } from "@/lib/auth/session";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { isPushConfigured, sendCampaignPush } from "@/lib/services/push";
import { pushSendSchema } from "@/lib/validation";

/**
 * POST /api/admin/push — a notification to the members who turned them on.
 * Body: { title, body, url?, segment: ALL | TIER_SILVER_UP | TIER_GOLD | AT_RISK | CHURNED | PATIENT, patientId? }
 */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  if (!isPushConfigured()) throw new HttpError(404, "Push notifications are not set up yet (WEB_PUSH_* keys)");
  const input = await parseJson(request, pushSendSchema);
  return ok(await sendCampaignPush(input, userContext(admin, request)));
});
