import { HttpError, ok, route } from "@/lib/http";
import { systemContext } from "@/lib/security/context";
import { enforceRateLimit } from "@/lib/security/ratelimit";
import { clientIp } from "@/lib/security/request";
import { markClaimUsed, verifyClaim } from "@/lib/services/partners";

type CodeContext = { params: Promise<{ code: string }> };

function limit(request: Request) {
  const ip = clientIp(request);
  if (ip !== "unknown") enforceRateLimit(`verify:${ip}`, 60, 15 * 60_000);
}

/** GET /api/verify/:code — a partner checks a member's coupon. Public; shows the member's first name only. */
export const GET = route<CodeContext>(async (request, { params }) => {
  limit(request);
  const { code } = await params;
  const coupon = await verifyClaim(decodeURIComponent(code));
  if (!coupon) throw new HttpError(404, "No coupon with that code");
  return ok({ coupon });
});

/** POST /api/verify/:code — the partner marks the coupon as used. The code itself is the secret. */
export const POST = route<CodeContext>(async (request, { params }) => {
  limit(request);
  const { code } = await params;
  const claim = await markClaimUsed(decodeURIComponent(code), { ...systemContext, request });
  return ok({ coupon: await verifyClaim(claim.code) });
});
