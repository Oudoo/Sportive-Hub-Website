"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export type Tab = { href: string; label: string; exact?: boolean };

/** Horizontal section tabs; highlights the one matching the current path. */
export function TabNav({ tabs, ariaLabel }: { tabs: Tab[]; ariaLabel: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={ariaLabel} className="mb-6 flex flex-wrap gap-1 border-b border-charcoal/15">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              active ? "border-charcoal text-charcoal" : "border-transparent text-olive hover:text-charcoal",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
