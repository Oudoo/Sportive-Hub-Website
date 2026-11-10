"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const NAV = [
  { href: "/portal/wallet", label: "Wallet" },
  { href: "/portal", label: "Overview", exact: true },
  { href: "/portal/rewards", label: "Rewards" },
  { href: "/portal/refer", label: "Refer & earn" },
  { href: "/portal/activity", label: "Activity" },
];

/** Member portal sections, as a bar under the header. */
export function PortalNav({ pendingVouchers }: { pendingVouchers: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal sections" className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-4 md:px-8">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors",
              active ? "border-charcoal text-charcoal" : "border-transparent text-olive hover:text-charcoal",
            )}
          >
            {item.label}
            {item.href === "/portal/wallet" && pendingVouchers > 0 && (
              <span className="ml-1.5 rounded-full bg-olive px-1.5 text-[10px] text-milk">{pendingVouchers}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
