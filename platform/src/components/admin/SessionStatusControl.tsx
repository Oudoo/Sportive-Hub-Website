"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { Select } from "@/components/ui";
import { SESSION_STATUS_LABELS } from "@/lib/format";

/** Changes a session's status in place. Completing a session awards attendance points. */
export function SessionStatusControl({ id, status }: { id: string; status: keyof typeof SESSION_STATUS_LABELS }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function change(next: string) {
    setPending(true);
    setMessage(null);
    try {
      await api(`/api/admin/sessions/${id}`, { method: "PUT", body: { status: next } });
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Select aria-label="Session status" value={status} disabled={pending} onChange={(e) => change(e.target.value)} className="min-w-36 py-1 text-sm">
        {Object.entries(SESSION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {message && <span className="text-xs text-red-800">{message}</span>}
    </div>
  );
}
