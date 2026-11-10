import { requireStaff } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { inspectCode } from "@/lib/services/scanner";
import { scannerInspectSchema } from "@/lib/validation";

/**
 * POST /api/admin/scanner/inspect — Body: { code }
 * Whatever was scanned or typed (member QR, SHM- code, RW- voucher, PT- coupon, phone
 * number, referral code) becomes one of: member, voucher, partner, none.
 */
export const POST = route(async (request) => {
  await requireStaff();
  const input = await parseJson(request, scannerInspectSchema);
  return ok(await inspectCode(input.code));
});
