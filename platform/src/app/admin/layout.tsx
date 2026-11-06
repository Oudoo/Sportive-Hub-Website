import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Every admin page lives under this layout. proxy.ts already turned away anyone
 * without an admin token; this re-checks against the database (role, isActive).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/portal");

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar userName={user.fullName} />
      <main className="w-full max-w-6xl px-4 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
