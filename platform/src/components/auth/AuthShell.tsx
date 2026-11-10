import type { ReactNode } from "react";

/** Centered card used by the login and register pages. */
export function AuthShell({ title, lede, children, footer }: { title: ReactNode; lede?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimisation needed */}
        <img src="/logo.png" alt="Sportive Hub, Movement Lab" className="mx-auto mb-8 h-12 w-auto" />
        <div className="rounded-sm border border-charcoal/15 bg-white/60 p-6 md:p-8">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          {lede && <p className="mt-1 text-sm text-olive">{lede}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-4 text-center text-sm text-olive">{footer}</p>}
      </div>
    </main>
  );
}
