import { homeFor, issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { systemContext } from "@/lib/security/context";
import { LIMITS, enforceRateLimit } from "@/lib/security/ratelimit";
import { clientIp } from "@/lib/security/request";
import { acceptInvite, peekInvite } from "@/lib/services/auth";
import { inviteAcceptSchema } from "@/lib/validation";

/** GET /api/auth/invite?token=... — who the invitation is for, so the welcome page can greet them. */
export const GET = route(async (request) => {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const invitee = await peekInvite(token);
  if (!invitee) throw new HttpError(410, "This link has expired or was already used. Ask the clinic for a new one.");
  return ok({ invitee });
});

/**
 * POST /api/auth/invite
 * Body: { token, password }
 * Sets the password for the invited account and signs them in.
 */
export const POST = route(async (request) => {
  const ip = clientIp(request);
  if (ip !== "unknown") enforceRateLimit(`invite:${ip}`, LIMITS.invitePerIp.limit, LIMITS.invitePerIp.windowMs);

  const input = await parseJson(request, inviteAcceptSchema);
  const user = await acceptInvite(input, { ...systemContext, request });

  const token = await issueSessionToken(user);
  const response = ok({ user, redirectTo: homeFor(user) });
  response.cookies.set(sessionCookie(token));
  return response;
});
