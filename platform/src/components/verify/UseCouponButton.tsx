"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { buttonClass } from "@/components/ui";

/** The partner marks the coupon as used. One press, confirmed. */
export function UseCouponButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function use() {
    if (!confirm("Mark this coupon as used? This cannot be undone from here.")) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/verify/${encodeURIComponent(code)}`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the coupon. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={use} disabled={pending} className={buttonClass("primary", "w-full border-emerald bg-emerald hover:border-leaf hover:bg-leaf")}>
        {pending ? "…" : "Mark as used"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
