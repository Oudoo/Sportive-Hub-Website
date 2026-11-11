"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

type Item = { href: string; label: string; exact?: boolean; adminOnly?: boolean };

const NAV: ReadonlyArray<Item> = [
  { href: "/admin", label: "Overview", exact: true, adminOnly: true },
  { href: "/admin/scanner", label: "Scanner" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/patients", label: "Patients" },
  { href: "/admin/packs", label: "Course packs" },
  { href: "/admin/crm", label: "Regulars & WhatsApp" },
  { href: "/admin/loyalty", label: "Loyalty & referrals", adminOnly: true },
  { href: "/admin/partners", label: "Partner perks", adminOnly: true },
  { href: "/admin/team", label: "Team", adminOnly: true },
  { href: "/admin/updates", label: "Updates", adminOnly: true },
  { href: "/admin/integrations", label: "Integrations", adminOnly: true },
  { href: "/admin/activity", label: "Activity log", adminOnly: true },
];

/** Sidebar on desktop, top bar on phones. Highlights the current section. Staff see the front-desk pages only. */
export function Sidebar({ userName, role, twoFactorOn }: { userName: string; role: "ADMIN" | "STAFF"; twoFactorOn: boolean }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => role === "ADMIN" || !item.adminOnly);

  return (
    <aside className="flex flex-col gap-4 bg-olive px-4 py-5 text-milk md:sticky md:top-0 md:h-screen md:overflow-y-auto md:px-6 md:py-8">
      <Link href={role === "ADMIN" ? "/admin" : "/admin/scanner"} className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img src="/logo-milk.png" alt="Sportive Hub" className="h-8 w-auto" />
      </Link>
      <div className="text-[11px] uppercase tracking-[0.2em] text-pastel">{role === "ADMIN" ? "Admin dashboard" : "Front desk"}</div>

      <nav aria-label="Admin sections" className="flex flex-wrap gap-1 md:mt-4 md:flex-col">
        {items.map((item) => {
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
