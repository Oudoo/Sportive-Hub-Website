import { requireUser } from "@/lib/auth/session";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { createCheckIn } from "@/lib/services/wallet";
import { checkInSchema } from "@/lib/validation";

/**
 * POST /api/me/checkin — "I'm here": the member tapped the room's NFC tag or scanned its QR.
 * Body: { branch, roomNumber?, method: "NFC_TAG" | "QR_SELF" }
 * The front desk sees it in the scanner feed and turns it into a logged session.
 */
export const POST = route(async (request) => {
  const user = await requireUser();
  if (user.role !== "PATIENT") throw new HttpError(403, "Only members check in");
  const input = await parseJson(request, checkInSchema);
  const result = await createCheckIn(user, input, userContext(user, request));
  return ok(result, { status: result.created ? 201 : 200 });
});
