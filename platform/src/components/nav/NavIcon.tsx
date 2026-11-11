import type { SVGProps } from "react";

export type NavIconName = "overview" | "scanner" | "sessions" | "patients" | "packs" | "crm" | "loyalty" | "partners" | "team" | "updates" | "integrations" | "activity" | "wallet" | "rewards" | "refer" | "history" | "account" | "menu" | "close";

const PATHS: Record<NavIconName, string> = {
  overview: "M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z",
  scanner: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10",
  sessions: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v4M16 4v4",
  patients: "M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 20a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0 0-6M20.5 20a5 5 0 0 0-4-4.9",
  packs: "M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4",
  crm: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 9h8M8 12h5",
  loyalty: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z",
  partners: "M3.5 11h17v9.5h-17zM2.5 7h19v4h-19zM12 7v13.5M12 7c-1.5 0-4.5-.5-4.5-2.5S10 2 12 7zm0 0c1.5 0 4.5-.5 4.5-2.5S14 2 12 7z",
  team: "M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1zM9.5 10h5",
  updates: "M4 10v4h3l7 4V6l-7 4H4zM17 9.5a3.5 3.5 0 0 1 0 5",
  integrations: "M9 4v4M15 4v4M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v3",
  activity: "M4 6h16M4 12h10M4 18h13",
  wallet: "M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7zM4 7a2 2 0 0 1 2-2h11v2M15 13h5",
  rewards: "M3.5 11h17v9.5h-17zM2.5 7h19v4h-19zM12 7v13.5",
  refer: "M16 6a2.5 2.5 0 1 0 0 .1M6 12a2.5 2.5 0 1 0 0 .1M16 18a2.5 2.5 0 1 0 0 .1M8.2 10.9l5.6-3.3M8.2 13.1l5.6 3.3",
  history: "M12 7v5l3 2M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4 4v3.5h3.5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
};

/** Stroke icons for the navigation, drawn on a 24-unit grid. */
export function NavIcon({ name, className, ...props }: { name: NavIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className ?? "size-5"} {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}
