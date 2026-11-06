"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Badge, Button, Input, Select } from "@/components/ui";
import { PAYMENT_METHOD_LABELS, formatDate, formatEgp } from "@/lib/format";

type Props = {
  id: string;
  paidAt: string | null;
  amountPaid: number | null;
  paymentMethod: keyof typeof PAYMENT_METHOD_LABELS | null;
  isComplimentary: boolean;
};

/**
 * Records that a session was paid for. For a referred patient's first session this is
 * what pays the referrer, so it is a deliberate, separate step from completing the session.
 */
export function SessionPaymentControl({ id, paidAt, amountPaid, paymentMethod, isComplimentary }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/sessions/${id}`, { method: "PUT", body });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update");
    } finally {
      setPending(false);
    }
  }

  function markPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send({ paid: true, amountPaid: form.get("amountPaid"), paymentMethod: form.get("paymentMethod") });
  }

  if (isComplimentary) {
    return <Badge tone="good">Reward · no payment</Badge>;
  }

  if (paidAt) {
    return (
      <div className="grid gap-1">
        <Badge tone="good">Paid {formatDate(paidAt)}</Badge>
        <div className="text-xs text-olive">
          {amountPaid !== null ? formatEgp(amountPaid) : "Amount not recorded"}
          {paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[paymentMethod]}` : ""}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Remove this payment record? A referral bonus already paid is kept.")) void send({ paid: false });
          }}
          className="justify-self-start text-xs text-olive underline underline-offset-4"
        >
          Undo
        </button>
        {error && <span className="text-xs text-red-800">{error}</span>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="grid gap-1">
        <Badge tone="warn">Not paid</Badge>
        <Button variant="secondary" className="min-h-8 justify-self-start px-3" onClick={() => setOpen(true)}>
          Mark as paid
        </Button>
        {error && <span className="text-xs text-red-800">{error}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={markPaid} className="grid gap-2 rounded-sm border border-charcoal/15 bg-white/60 p-2">
      <Input name="amountPaid" type="number" min={0} step={1} placeholder="Amount (EGP, optional)" aria-label="Amount paid" className="py-1 text-sm" />
      <Select name="paymentMethod" defaultValue="CASH" aria-label="Payment method" className="py-1 text-sm">
        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <div className="flex gap-1">
        <Button type="submit" className="min-h-8 px-3" disabled={pending}>
          {pending ? "Saving…" : "Confirm paid"}
        </Button>
        <Button type="button" variant="ghost" className="min-h-8 px-2" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <span className="text-xs text-red-800">{error}</span>}
    </form>
  );
}
