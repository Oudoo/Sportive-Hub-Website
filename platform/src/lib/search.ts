import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Free-text search helpers.
 *
 * Prisma's `contains` becomes `LIKE ?`, and on Hostinger's MySQL the bound pattern
 * arrives with the binary collation, which the server refuses to compare with our
 * utf8mb4_unicode_ci columns ("Illegal mix of collations"). These helpers run the
 * LIKE themselves with an explicit collation and hand back ids, which the callers
 * then use in ordinary Prisma queries (`id: { in: ids }`). Works on MySQL and MariaDB.
 */

const COLLATION = "utf8mb4_unicode_ci";
const MAX_IDS = 1000;

/** Escapes the LIKE wildcards in user input so "100%" matches literally. */
function likePattern(q: string): string {
  return "%" + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
}

function likeClause(column: string, pattern: string): Prisma.Sql {
  return Prisma.sql`${Prisma.raw("`" + column + "`")} LIKE CONVERT(${pattern} USING utf8mb4) COLLATE ${Prisma.raw(COLLATION)}`;
}

/** Ids of users whose name, email or phone contains `q` (optionally only one role). */
export async function searchUserIds(q: string, options: { role?: "ADMIN" | "PATIENT" } = {}): Promise<string[]> {
  const pattern = likePattern(q.trim());
  const roleClause = options.role ? Prisma.sql`AND \`role\` = ${options.role}` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT \`id\` FROM \`User\` WHERE (${likeClause("fullName", pattern)} OR ${likeClause("email", pattern)} OR ${likeClause("phone", pattern)}) ${roleClause} LIMIT ${MAX_IDS}`,
  );
  return rows.map((row) => row.id);
}

/** Ids of redemptions whose reward name contains `q`. */
export async function searchRedemptionIdsByReward(q: string): Promise<string[]> {
  const pattern = likePattern(q.trim());
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT \`id\` FROM \`Redemption\` WHERE ${likeClause("rewardName", pattern)} LIMIT ${MAX_IDS}`,
  );
  return rows.map((row) => row.id);
}
