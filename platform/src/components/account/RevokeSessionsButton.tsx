"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/api";
import { Button } from "@/components/ui";

/** Signs the user out of every device, including this one. */
export function RevokeSessionsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function revoke() {
    if (!confirm("Sign out of every device, including this one? You will need to sign in again.")) return;
    setPending(true);
    try {
      await api("/api/me/sessions/revoke", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="secondary" onClick={revoke} disabled={pending}>
      {pending ? "Signing out…" : "Sign out everywhere"}
    </Button>
  );
}
