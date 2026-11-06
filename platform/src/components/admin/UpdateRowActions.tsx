"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { Button } from "@/components/ui";

/** Publish / unpublish / delete buttons for one update row. */
export function UpdateRowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        className="min-h-8 px-3 text-[10px]"
        onClick={() => run(() => api(`/api/admin/updates/${id}`, { method: "PUT", body: { publish: !published } }))}
      >
        {published ? "Unpublish" : "Publish"}
      </Button>
      <Button
        variant="danger"
        disabled={pending}
        className="min-h-8 px-3 text-[10px]"
        onClick={() => {
          if (confirm("Delete this update? This cannot be undone.")) run(() => api(`/api/admin/updates/${id}`, { method: "DELETE" }));
        }}
      >
        Delete
      </Button>
      {error && <span className="text-xs text-red-800">{error}</span>}
    </div>
  );
}
