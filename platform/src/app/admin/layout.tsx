import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Every admin page lives under this layout. proxy.ts already turned away anyone
 * without a team token; this re-checks against the database (role, isActive, sessionVersion).
 * Staff accounts see the front-desk pages; the admin-only pages redirect them to the scanner.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role === "PATIENT") redirect("/portal/wallet");

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <Sidebar userName={user.fullName} role={user.role} twoFactorOn={!!user.totpEnabledAt} />
      <main className="w-full max-w-6xl px-4 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
