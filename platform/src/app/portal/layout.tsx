import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PortalNav } from "@/components/portal/PortalNav";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** Member portal frame. Admins and staff can open it too, to see what members see. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal/wallet");
  const pendingVouchers = await prisma.redemption.count({ where: { userId: user.id, status: "PENDING" } });
  const teamLink = user.role === "ADMIN" ? { href: "/admin", label: "Admin" } : user.role === "STAFF" ? { href: "/admin/scanner", label: "Scanner" } : null;

  return (
    <div className="flex min-h-screen flex-col">
      <PortalNav userName={user.fullName} pendingVouchers={pendingVouchers} teamLink={teamLink} />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
