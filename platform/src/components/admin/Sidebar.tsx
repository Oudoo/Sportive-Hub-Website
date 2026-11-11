"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { NavIcon, type NavIconName } from "@/components/nav/NavIcon";
import { SideDrawer } from "@/components/nav/SideDrawer";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { cx } from "@/components/ui";

type Item = { href: string; label: string; icon: NavIconName; exact?: boolean; adminOnly?: boolean };
type Group = { heading: string; items: Item[] };

const GROUPS: ReadonlyArray<Group> = [
  {
    heading: "Front desk",
    items: [
      { href: "/admin/scanner", label: "Scanner", icon: "scanner" },
      { href: "/admin/sessions", label: "Sessions", icon: "sessions" },
      { href: "/admin/patients", label: "Patients", icon: "patients" },
      { href: "/admin/packs", label: "Course packs", icon: "packs" },
      { href: "/admin/crm", label: "Regulars & WhatsApp", icon: "crm" },
    ],
  },
  {
    heading: "Clinic",
    items: [
      { href: "/admin", label: "Overview", icon: "overview", exact: true, adminOnly: true },
      { href: "/admin/loyalty", label: "Loyalty & referrals", icon: "loyalty", adminOnly: true },
      { href: "/admin/partners", label: "Partner perks", icon: "partners", adminOnly: true },
      { href: "/admin/team", label: "Team", icon: "team", adminOnly: true },
      { href: "/admin/updates", label: "Updates", icon: "updates", adminOnly: true },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/admin/integrations", label: "Integrations", icon: "integrations", adminOnly: true },
      { href: "/admin/activity", label: "Activity log", icon: "activity", adminOnly: true },
    ],
  },
];

function Brand({ home }: { home: string }) {
  return (
    <Link href={home} className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
      <img src="/logo-milk.png" alt="Sportive Hub" className="h-8 w-auto" />
    </Link>
  );
}

/**
 * The admin menu: a fixed left sidebar on desktop (icons, grouped), a top bar with a
 * hamburger that opens a left drawer on phones. Staff see the front-desk items only.
 */
export function Sidebar({ userName, role, twoFactorOn }: { userName: string; role: "ADMIN" | "STAFF"; twoFactorOn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = role === "ADMIN" ? "/admin" : "/admin/scanner";
  const groups = GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => role === "ADMIN" || !item.adminOnly) })).filter((group) => group.items.length > 0);
  const current = groups.flatMap((g) => g.items).find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));

  const nav = (
    <nav aria-label="Admin sections" className="grid gap-5">
      {groups.map((group) => (
        <div key={group.heading}>
          <div className="mb-1.5 px-3 text-[10px] uppercase tracking-[0.2em] text-pastel/80">{group.heading}</div>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors", active ? "bg-milk text-olive" : "text-milk/85 hover:bg-milk/10 hover:text-milk")}
                  >
                    <NavIcon name={item.icon} className="size-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto grid gap-1 border-t border-milk/20 pt-4 text-sm">
      <Link href="/account" className="flex items-center gap-3 truncate px-3 py-1.5 text-milk/85 hover:text-milk" title={userName}>
        <NavIcon name="account" className="size-[18px] shrink-0" />
        <span className="truncate">{userName}</span>
      </Link>
      {!twoFactorOn && (
        <Link href="/account#two-factor" className="px-3 text-xs text-sand hover:text-milk">
          Turn on two-factor sign-in →
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-x-3 px-3">
        <InstallAppButton className="px-0 text-milk/80 hover:text-milk" />
        <LogoutButton className="px-0 text-milk/80 hover:text-milk" />
      </div>
    </div>
  );

  return (
    <>
      {/* Phones: a slim top bar and a drawer */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-olive px-4 py-3 text-milk md:hidden">
        <Brand home={home} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-milk/80">{current?.label ?? ""}</span>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="rounded-full p-2 hover:bg-milk/10">
            <NavIcon name="menu" />
          </button>
        </div>
      </header>
      <SideDrawer open={open} onClose={() => setOpen(false)} title={<Brand home={home} />}>
        <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-pastel">{role === "ADMIN" ? "Admin dashboard" : "Front desk"}</div>
        {nav}
        {footer}
      </SideDrawer>

      {/* Desktop: the fixed left sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col md:gap-4 md:overflow-y-auto md:bg-olive md:px-4 md:py-6 md:text-milk">
        <div className="px-3">
          <Brand home={home} />
          <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-pastel">{role === "ADMIN" ? "Admin dashboard" : "Front desk"}</div>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
