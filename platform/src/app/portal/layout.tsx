import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { PortalNav } from "@/components/portal/PortalNav";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** Patient portal frame. Admins can open it too, to see what patients see. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  const pendingVouchers = await prisma.redemption.count({ where: { userId: user.id, status: "PENDING" } });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-charcoal/15">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/portal/wallet" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/logo.png" alt="Sportive Hub" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user.role !== "PATIENT" && (
              <Link href={user.role === "ADMIN" ? "/admin" : "/admin/scanner"} className="text-olive underline underline-offset-4">
                {user.role === "ADMIN" ? "Admin" : "Scanner"}
              </Link>
            )}
            <Link href="/account" className="hidden text-olive underline underline-offset-4 sm:inline">
              {user.fullName}
            </Link>
            <InstallAppButton />
            <LogoutButton />
          </div>
        </div>
        <PortalNav pendingVouchers={pendingVouchers} />
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
