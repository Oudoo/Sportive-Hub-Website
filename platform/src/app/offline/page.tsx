import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

/**
 * Shown by the service worker when a page cannot be loaded. Styled inline so it
 * reads correctly even when the app's stylesheet is not in the cache yet.
 */
export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#F0ECE3", color: "#282828", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <p style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#595641", margin: 0 }}>Sportive Hub</p>
        <h1 style={{ fontSize: 28, fontWeight: 500, margin: "12px 0 8px" }}>You&apos;re offline</h1>
        <p style={{ color: "#595641", margin: 0 }}>This page needs a connection. Check your signal and try again.</p>
        {/* A plain link on purpose: a full navigation retries the network, which a client-side <Link> would not. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{ display: "inline-block", marginTop: 24, padding: "12px 20px", border: "1px solid #282828", borderRadius: 2, color: "#282828", textDecoration: "none", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Try again
        </a>
      </div>
    </main>
  );
}
