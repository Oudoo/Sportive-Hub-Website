"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { Button } from "@/components/ui";

/** Corrections on one pack: a session used or given back, cancel, reactivate. The scanner handles the normal case. */
export function PackRowActions({ id, status, used, total }: { id: string; status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED"; used: number; total: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/packs/${id}`, { method: "PATCH", body });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-1">
        {status === "ACTIVE" && used < total && (
          <Button variant="secondary" className="min-h-8 px-2" disabled={pending} onClick={() => patch({ usedSessions: used + 1 }, "Use one session without logging it from the scanner?")}>
            +1 used
          </Button>
        )}
        {(status === "ACTIVE" || status === "COMPLETED") && used > 0 && (
          <Button variant="secondary" className="min-h-8 px-2" disabled={pending} onClick={() => patch({ usedSessions: used - 1 })}>
            −1 used
          </Button>
        )}
        {status === "ACTIVE" && (
          <Button variant="danger" className="min-h-8 px-2" disabled={pending} onClick={() => patch({ status: "CANCELLED" }, "Cancel this pack? Remaining sessions are lost.")}>
            Cancel
          </Button>
        )}
        {(status === "EXPIRED" || status === "CANCELLED") && (
          <Button variant="secondary" className="min-h-8 px-2" disabled={pending} onClick={() => patch({ status: "ACTIVE", expiresAt: "" })}>
            Reactivate
          </Button>
        )}
      </div>
      {error && <span className="text-xs text-red-800">{error}</span>}
    </div>
  );
}
