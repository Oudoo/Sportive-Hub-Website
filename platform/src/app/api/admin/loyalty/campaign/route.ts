import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { ok, parseJson, parseQuery, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { previewCampaign, runCampaign } from "@/lib/services/patients";
import { campaignSchema } from "@/lib/validation";

/** GET /api/admin/loyalty/campaign?segment=ALL_ACTIVE — how many patients the campaign would reach. */
export const GET = route(async (request) => {
  await requireAdmin();
  const { segment } = parseQuery(request.nextUrl, campaignSchema.pick({ segment: true }));
  return ok({ segment, patients: await previewCampaign(segment) });
});

/** POST /api/admin/loyalty/campaign — Body: { segment, points, note }. Awards the points to everyone in the segment. */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJson(request, campaignSchema.extend({ confirm: z.literal(true) }));
  return ok(await runCampaign(input, userContext(admin, request)));
});
