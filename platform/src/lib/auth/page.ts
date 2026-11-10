import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isTeam, type SafeUser } from "@/lib/serialize";

/**
 * Page-level guards. Route handlers throw HttpErrors; pages redirect instead.
 * proxy.ts already keeps patients out of /admin; these re-check against the database
 * and keep the admin-only pages away from staff accounts.
 */

export async function requireStaffPage(next = "/admin/scanner"): Promise<SafeUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!isTeam(user.role)) redirect("/portal/wallet");
  return user;
}

export async function requireAdminPage(next = "/admin"): Promise<SafeUser> {
  const user = await requireStaffPage(next);
  if (user.role !== "ADMIN") redirect("/admin/scanner");
  return user;
}
