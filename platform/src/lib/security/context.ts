import type { ApiPrincipal } from "@/lib/integrations/apikeys";
import type { AuditActor } from "@/lib/security/audit";
import type { SafeUser } from "@/lib/serialize";

/**
 * Who is performing an action and from which request. Passed from route handlers
 * into services so they can write the audit log and attribute points changes.
 */
export type ActionContext = {
  actor: AuditActor;
  request?: Request | null;
};

export function userContext(user: Pick<SafeUser, "id">, request?: Request | null): ActionContext {
  return { actor: { type: "USER", id: user.id }, request };
}

export function apiContext(principal: ApiPrincipal, request?: Request | null): ActionContext {
  return { actor: { type: "API_KEY", id: principal.id }, request };
}

export const systemContext: ActionContext = { actor: { type: "SYSTEM" } };

/** The admin's user id for `LoyaltyTransaction.actorId`, or undefined for keys and the system. */
export function actingUserId(ctx: ActionContext): string | undefined {
  return ctx.actor.type === "USER" ? ctx.actor.id : undefined;
}
