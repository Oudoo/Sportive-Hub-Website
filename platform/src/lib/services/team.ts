import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { generateMemberCode, normalizePhone } from "@/lib/member";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import { safeUserSelect, type SafeUser } from "@/lib/serialize";
import { createInviteLink, unusablePasswordHash } from "@/lib/services/auth";
import type { TeamCreateInput, TeamUpdateInput } from "@/lib/validation";

/**
 * The clinic's team: admins and staff. Each person has their own account, so the
 * activity log and the scanner feed say who did what. New accounts start without a
 * password and receive an invitation link.
 */

export async function listTeam() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    select: { ...safeUserSelect, _count: { select: { auditLogs: true } } },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });
}

export type TeamRow = Awaited<ReturnType<typeof listTeam>>[number];

export async function createTeamMember(input: TeamCreateInput, ctx: ActionContext): Promise<{ user: SafeUser; invite: { url: string; expiresAt: Date } }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "An account with this email already exists", [{ path: "email", message: "Already registered" }]);
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await unusablePasswordHash(),
      fullName: input.fullName,
      phone,
      role: input.role,
      preferredBranch: input.preferredBranch ?? null,
      memberCode: generateMemberCode(),
      joinedVia: "team",
    },
    select: safeUserSelect,
  });
  await audit({ action: "team.created", actor: ctx.actor, target: { type: "user", id: user.id }, request: ctx.request, meta: { role: input.role } });
  const invite = await createInviteLink(user.id, ctx);
  return { user, invite };
}

export async function updateTeamMember(id: string, input: TeamUpdateInput, actor: SafeUser, ctx: ActionContext): Promise<SafeUser> {
  const existing = await prisma.user.findFirst({ where: { id, role: { in: ["ADMIN", "STAFF"] } }, select: { id: true, role: true } });
  if (!existing) throw new HttpError(404, "Team member not found");
  if (existing.id === actor.id && (input.isActive === false || (input.role && input.role !== "ADMIN"))) {
    throw new HttpError(409, "You cannot deactivate or demote your own account");
  }
  if (existing.role === "ADMIN" && (input.role === "STAFF" || input.isActive === false)) {
    const admins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) throw new HttpError(409, "Keep at least one active admin");
  }
  const user = await prisma.user.update({ where: { id }, data: input, select: safeUserSelect });
  await audit({ action: "team.updated", actor: ctx.actor, target: { type: "user", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  return user;
}
