"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";
import { buttonClass } from "@/components/ui";
import { useClientFlag } from "@/components/useClientFlag";

type State = "checking" | "off" | "on" | "denied" | "unavailable";

function vapidKey(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/** "Turn on notifications": subscribes this phone to web push for voucher, stamp and pack alerts. */
export function PushToggle({ configured, publicKey, className }: { configured: boolean; publicKey: string | null; className?: string }) {
  const supported = useClientFlag(() => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported || !configured) return;
    let cancelled = false;
    (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return "unavailable" as const;
      if (Notification.permission === "denied") return "denied" as const;
      const subscription = await registration.pushManager.getSubscription();
      return subscription ? ("on" as const) : ("off" as const);
    })()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [supported, configured]);

  if (!supported || !configured || !publicKey || state === "checking" || state === "unavailable") return null;

  async function toggle() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await api("/api/me/push", { method: "DELETE", body: { endpoint: existing.endpoint } });
        await existing.unsubscribe();
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(publicKey!) });
      await api("/api/me/push", { method: "POST", body: subscription.toJSON() });
      setState("on");
    } catch (error) {
      console.warn("push subscription failed", error);
    } finally {
      setBusy(false);
    }
  }

  if (state === "denied") return <p className={className ?? "text-xs text-mist/60"}>Notifications are blocked for this site in the browser settings.</p>;

  return (
    <button type="button" onClick={toggle} disabled={busy} className={buttonClass("secondary", className ?? "border-mist/40 text-mist hover:border-mist")}>
      {busy ? "…" : state === "on" ? "Notifications on · turn off" : "Turn on notifications"}
    </button>
  );
}
