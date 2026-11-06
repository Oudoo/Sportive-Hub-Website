"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { Button } from "@/components/ui";

/** Fulfil or cancel one voucher. Cancelling refunds the points. */
export function RedemptionActions({ id, status, rewardName }: { id: string; status: "PENDING" | "FULFILLED" | "CANCELLED"; rewardName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: "FULFILLED" | "CANCELLED") {
    const question = next === "FULFILLED" ? `Mark “${rewardName}” as handed over?` : `Cancel this voucher and refund the points?`;
    if (!confirm(question)) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/loyalty/redemptions/${id}`, { method: "PATCH", body: { status: next } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update");
    } finally {
      setPending(false);
    }
  }

  if (status === "CANCELLED") return null;

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-1">
        {status === "PENDING" && (
          <Button className="min-h-8 px-3" disabled={pending} onClick={() => change("FULFILLED")}>
            Fulfil
          </Button>
        )}
        <Button variant="danger" className="min-h-8 px-3" disabled={pending} onClick={() => change("CANCELLED")}>
          Cancel &amp; refund
        </Button>
      </div>
      {error && <span className="text-xs text-red-800">{error}</span>}
    </div>
  );
}
