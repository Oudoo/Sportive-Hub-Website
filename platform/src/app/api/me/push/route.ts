import { requireUser } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { userAgent } from "@/lib/security/request";
import { isPushConfigured, pushPublicKey, subscribePush, unsubscribePush } from "@/lib/services/push";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/validation";

/** GET /api/me/push — whether push is available and the VAPID public key the browser needs. */
export const GET = route(async () => {
  await requireUser();
  return ok({ configured: isPushConfigured(), publicKey: pushPublicKey() });
});

/** POST /api/me/push — Body: a PushSubscription JSON { endpoint, keys: { p256dh, auth } }. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, pushSubscribeSchema);
  await subscribePush(user.id, input, userAgent(request), userContext(user, request));
  return ok({ ok: true }, { status: 201 });
});

/** DELETE /api/me/push — Body: { endpoint }. */
export const DELETE = route(async (request) => {
  const user = await requireUser();
  const input = await parseJson(request, pushUnsubscribeSchema);
  await unsubscribePush(user.id, input.endpoint);
  return ok({ ok: true });
});
