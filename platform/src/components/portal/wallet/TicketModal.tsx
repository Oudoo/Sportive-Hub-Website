"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { buttonClass } from "@/components/ui";
import { formatShortDate } from "@/lib/format";

export type Ticket = {
  kind: "voucher" | "coupon";
  title: string;
  subtitle?: string | null;
  emoji?: string | null;
  badge?: string | null;
  code: string;
  qrSvg: string;
  expiresAt: string | null;
  terms?: string | null;
  /** Anything but "ACTIVE" / "PENDING" shows the ticket as no longer usable. */
  status?: string;
  usedAt?: string | null;
  cancel?: { label: string; confirm: string; run: () => Promise<void> } | null;
};

/** A one-time redemption ticket: the top names the reward, the stub carries the code, the QR, the expiry. */
export function TicketModal({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ticket && !dialog.open) dialog.showModal();
    if (!ticket && dialog.open) dialog.close();
  }, [ticket]);

  const usable = !ticket?.status || ticket.status === "ACTIVE" || ticket.status === "PENDING";

  async function cancel() {
    if (!ticket?.cancel || !confirm(ticket.cancel.confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await ticket.cancel.run();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not do that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(92vw,380px)] rounded-2xl bg-transparent p-0 text-ink backdrop:bg-ink/85 backdrop:backdrop-blur-sm"
      aria-label={ticket?.title ?? "Ticket"}
    >
      {ticket && (
        <div className="overflow-hidden rounded-2xl bg-mist" style={{ "--ticket-bg": "#26251f" } as CSSProperties}>
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-pine">{ticket.kind === "coupon" ? "Partner coupon" : "Reward voucher"}</div>
              {ticket.badge && <span className="rounded-full bg-emerald px-2.5 py-0.5 text-xs font-medium text-mist">{ticket.badge}</span>}
            </div>
            <div className="mt-3 flex items-center gap-3">
              {ticket.emoji && (
                <span className="text-3xl" aria-hidden>
                  {ticket.emoji}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-medium leading-tight">{ticket.title}</h2>
                {ticket.subtitle && <p className="mt-1 text-sm text-pine">{ticket.subtitle}</p>}
              </div>
            </div>
            {ticket.terms && <p className="mt-3 text-xs leading-relaxed text-ink/70">{ticket.terms}</p>}
          </div>

          <div className="ticket-tear" />

          <div className="ticket-scallop bg-mist px-6 pb-8 pt-5">
            <div className={"flex items-center gap-4 " + (usable ? "" : "opacity-50")}>
              <div className="qr-box size-24 shrink-0 rounded-lg bg-white p-1.5" dangerouslySetInnerHTML={{ __html: ticket.qrSvg }} />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-pine">Code</div>
                <div className="break-all font-mono text-2xl tracking-wider">{ticket.code}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-pine">Exp. date</dt>
                <dd className="font-medium">{ticket.expiresAt ? formatShortDate(ticket.expiresAt) : "No expiry"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-pine">One time</dt>
                <dd className="font-medium">Yes</dd>
              </div>
            </dl>
            {!usable && (
              <p className="mt-4 rounded-md bg-ink/10 px-3 py-2 text-sm">
                {ticket.status === "USED" || ticket.status === "FULFILLED" ? `Used${ticket.usedAt ? ` on ${formatShortDate(ticket.usedAt)}` : ""}.` : ticket.status === "EXPIRED" ? "Expired." : "No longer valid."}
              </p>
            )}
            {usable && <p className="mt-4 text-xs text-ink/70">{ticket.kind === "coupon" ? "Show this to the partner. They scan the code or type it in." : "Show this at the front desk. Staff scan the code or type it in."}</p>}
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onClose} className={buttonClass("primary")}>
                Done
              </button>
              {usable && ticket.cancel && (
                <button type="button" onClick={cancel} disabled={busy} className={buttonClass("ghost")}>
                  {busy ? "…" : ticket.cancel.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
