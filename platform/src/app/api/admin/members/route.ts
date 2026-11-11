import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { joinMember } from "@/lib/services/members";
import { joinSchema } from "@/lib/validation";

/**
 * POST /api/admin/members — the front desk signs a member up with a name and a mobile number.
 * Body: { fullName, phone, email?, referralCode?, focusArea?, preferredBranch? }
 * Returns the member and their wallet link, ready to send on WhatsApp.
 */
export const POST = route(async (request) => {
  const staff = await requireStaff();
  const input = await parseJson(request, joinSchema);
  const result = await joinMember({ ...input, source: "counter" }, userContext(staff, request));
  return ok(result, { status: 201 });
});
