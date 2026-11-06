"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Copies `value` to the clipboard, with a fallback prompt where the clipboard API is unavailable. */
export function CopyButton({ value, label = "Copy", copiedLabel = "Copied", variant = "secondary", className }: { value: string; label?: string; copiedLabel?: string; variant?: "primary" | "secondary" | "ghost"; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this:", value);
    }
  }

  return (
    <Button type="button" variant={variant} onClick={copy} className={className}>
      {copied ? copiedLabel : label}
    </Button>
  );
}
