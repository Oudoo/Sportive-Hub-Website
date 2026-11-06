"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

const NAV: ReadonlyArray<{ href: string; label: string; exact?: boolean }> = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/patients", label: "Patients" },
  { href: "/admin/loyalty", label: "Loyalty & referrals" },
  { href: "/admin/updates", label: "Updates" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/activity", label: "Activity log" },
];

/** Sidebar on desktop, top bar on phones. Highlights the current section. */
export function Sidebar({ userName, twoFactorOn }: { userName: string; twoFactorOn: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-4 bg-olive px-4 py-5 text-milk md:sticky md:top-0 md:h-screen md:px-6 md:py-8">
      <Link href="/admin" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img src="/logo-milk.png" alt="Sportive Hub" className="h-8 w-auto" />
      </Link>
      <div className="text-[11px] uppercase tracking-[0.2em] text-pastel">Admin dashboard</div>

      <nav aria-label="Admin sections" className="flex flex-wrap gap-1 md:mt-4 md:flex-col">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "rounded-sm px-3 py-2 text-sm transition-colors " +
                (active ? "bg-milk text-olive" : "text-milk/85 hover:bg-milk/10 hover:text-milk")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-1 border-t border-milk/20 pt-4 text-sm">
        <Link href="/account" className="truncate text-milk/85 hover:text-milk" title={userName}>
          {userName}
        </Link>
        {!twoFactorOn && (
          <Link href="/account#two-factor" className="text-xs text-sand hover:text-milk">
            Turn on two-factor sign-in →
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-3">
          <InstallAppButton className="px-0 text-milk/80 hover:text-milk" />
          <LogoutButton className="px-0 text-milk/80 hover:text-milk" />
        </div>
      </div>
    </aside>
  );
}
