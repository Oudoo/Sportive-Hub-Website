"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { NavIcon, type NavIconName } from "@/components/nav/NavIcon";
import { SideDrawer } from "@/components/nav/SideDrawer";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { cx } from "@/components/ui";

type Item = { href: string; label: string; icon: NavIconName; exact?: boolean };

const NAV: Item[] = [
  { href: "/portal/wallet", label: "Wallet", icon: "wallet" },
  { href: "/portal", label: "Overview", icon: "overview", exact: true },
  { href: "/portal/rewards", label: "Rewards", icon: "rewards" },
  { href: "/portal/refer", label: "Refer & earn", icon: "refer" },
  { href: "/portal/activity", label: "Activity", icon: "history" },
];

/**
 * The member portal header: logo, sections as tabs on wide screens, and a hamburger that
 * opens a left drawer on phones (where the tabs used to scroll sideways).
 */
export function PortalNav({ userName, pendingVouchers, teamLink }: { userName: string; pendingVouchers: number; teamLink: { href: string; label: string } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (item: Item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const current = NAV.find(isActive);

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/15 bg-milk/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <Link href="/portal/wallet" className="flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/logo.png" alt="Sportive Hub" className="h-8 w-auto" />
        </Link>

        {/* Wide screens: tabs in the header */}
        <nav aria-label="Portal sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors", active ? "bg-olive text-milk" : "text-olive hover:bg-pastel/50 hover:text-charcoal")}>
                <NavIcon name={item.icon} className="size-4" />
                {item.label}
                {item.href === "/portal/wallet" && pendingVouchers > 0 && <span className={cx("rounded-full px-1.5 text-[10px]", active ? "bg-milk text-olive" : "bg-olive text-milk")}>{pendingVouchers}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 text-sm md:flex">
          {teamLink && (
            <Link href={teamLink.href} className="whitespace-nowrap text-olive underline underline-offset-4">
              {teamLink.label}
            </Link>
          )}
          <Link href="/account" title={userName} aria-label="Account" className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-olive hover:bg-pastel/50 hover:text-charcoal">
            <NavIcon name="account" className="size-5" />
            <span className="hidden max-w-[10rem] truncate lg:inline">{userName}</span>
          </Link>
          <InstallAppButton className="px-2" />
          <LogoutButton className="px-2" />
        </div>

        {/* Phones: the current section and the menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <span className="text-sm text-olive">{current?.label ?? ""}</span>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="relative rounded-full p-2 text-charcoal hover:bg-pastel/50">
            <NavIcon name="menu" />
            {pendingVouchers > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-olive px-1.5 text-[10px] text-milk">{pendingVouchers}</span>}
          </button>
        </div>
      </div>

      <SideDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={
          // eslint-disable-next-line @next/next/no-img-element -- static brand asset
          <img src="/logo-milk.png" alt="Sportive Hub" className="h-8 w-auto" />
        }
      >
        <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-pastel">My membership</div>
        <nav aria-label="Portal sections" className="grid gap-0.5">
          {NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors", active ? "bg-milk text-olive" : "text-milk/85 hover:bg-milk/10 hover:text-milk")}>
                <NavIcon name={item.icon} className="size-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/portal/wallet" && pendingVouchers > 0 && <span className={cx("rounded-full px-1.5 text-[10px]", active ? "bg-olive text-milk" : "bg-milk text-olive")}>{pendingVouchers}</span>}
              </Link>
            );
          })}
          <Link href="/account" className={cx("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors", pathname.startsWith("/account") ? "bg-milk text-olive" : "text-milk/85 hover:bg-milk/10 hover:text-milk")}>
            <NavIcon name="account" className="size-[18px] shrink-0" />
            <span className="truncate">{userName}</span>
          </Link>
          {teamLink && (
            <Link href={teamLink.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-milk/85 hover:bg-milk/10 hover:text-milk">
              <NavIcon name="scanner" className="size-[18px] shrink-0" />
              {teamLink.label}
            </Link>
          )}
        </nav>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 border-t border-milk/20 px-3 pt-4">
          <InstallAppButton className="px-0 text-milk/80 hover:text-milk" />
          <LogoutButton className="px-0 text-milk/80 hover:text-milk" />
        </div>
      </SideDrawer>
    </header>
  );
}
