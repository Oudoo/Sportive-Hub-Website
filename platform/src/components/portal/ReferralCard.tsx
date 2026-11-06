"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** The patient's code with copy and WhatsApp-share buttons. */
export function ReferralCard({ code, link, bonus }: { code: string; link: string; bonus: number }) {
  const [copied, setCopied] = useState(false);
  const message = `Join me at Sportive Hub and we both get bonus points. Sign up with my code ${code}: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy your referral link:", link);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-sm bg-olive px-4 py-3 text-milk">
        <div className="text-[11px] uppercase tracking-[0.2em] text-pastel">Your code</div>
        <div className="font-mono text-2xl tracking-wider">{code}</div>
      </div>
      <p className="text-sm text-olive">
        Friends who sign up with it get a welcome bonus, and you get {bonus} points each time.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
        <a
          className="inline-flex min-h-10 items-center rounded-sm border border-charcoal/40 px-4 text-xs font-medium uppercase tracking-[0.12em] hover:border-charcoal"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener"
        >
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
