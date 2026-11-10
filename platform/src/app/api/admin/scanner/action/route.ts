import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { executeAction } from "@/lib/services/scanner";
import { scannerActionSchema } from "@/lib/validation";

/**
 * POST /api/admin/scanner/action — the one button the scanner shows.
 * Body: { action: "LOG_SESSION", memberId, type, branch?, roomNumber?, coursePackId?, practitioner?, paid?, amountPaid?, paymentMethod?, checkInId? }
 *     | { action: "REDEEM_VOUCHER", code }
 *     | { action: "USE_PARTNER_COUPON", code }
 *     | { action: "CONFIRM_PAYMENT", sessionId, amountPaid?, paymentMethod? }
 * Returns a message, the refreshed member and an auditId that POST /undo/:auditId reverses within 24 hours.
 */
export const POST = route(async (request) => {
  const staff = await requireStaff();
  const input = await parseJson(request, scannerActionSchema);
  return ok(await executeAction(input, staff, userContext(staff, request)), { status: 201 });
});
