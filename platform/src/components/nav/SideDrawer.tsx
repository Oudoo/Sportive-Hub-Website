"use client";

import { useEffect, type ReactNode } from "react";
import { NavIcon } from "@/components/nav/NavIcon";

/**
 * A left-hand drawer for phones: slides in over the page, closes on the backdrop,
 * the Escape key or any link inside. The desktop layouts show a fixed sidebar instead.
 */
export function SideDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="drawer-fade absolute inset-0 bg-charcoal/60" />
      <aside
        className="drawer-in absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col overflow-y-auto bg-olive px-4 pb-6 pt-4 text-milk shadow-2xl"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) onClose();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>{title}</div>
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-2 text-milk/80 hover:bg-milk/10 hover:text-milk">
            <NavIcon name="close" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
