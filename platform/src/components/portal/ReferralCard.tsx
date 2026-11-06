"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** The patient's code with copy, native share and WhatsApp buttons. */
export function ReferralCard({ code, link, message }: { code: string; link: string; message: string }) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  async function copy(what: "link" | "message") {
    try {
      await navigator.clipboard.writeText(what === "link" ? link : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      prompt("Copy your referral link:", link);
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join me at Sportive Hub", text: message });
        return;
      } catch {
        /* cancelled: fall through to copying */
      }
    }
    copy("message");
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-sm bg-olive px-4 py-3 text-milk">
        <div className="text-[11px] uppercase tracking-[0.2em] text-pastel">Your code</div>
        <div className="font-mono text-2xl tracking-wider">{code}</div>
        <div className="mt-1 break-all text-xs text-milk/80">{link}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          className="inline-flex min-h-10 items-center rounded-sm border border-charcoal bg-charcoal px-4 text-xs font-medium uppercase tracking-[0.12em] text-milk hover:border-olive hover:bg-olive"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener"
        >
          Share on WhatsApp
        </a>
        <Button variant="secondary" onClick={() => copy("link")}>
          {copied === "link" ? "Link copied" : "Copy link"}
        </Button>
        <Button variant="secondary" onClick={share}>
          {copied === "message" ? "Message copied" : "Share…"}
        </Button>
      </div>
    </div>
  );
}
