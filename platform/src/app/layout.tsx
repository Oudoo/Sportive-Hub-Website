import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sportive Hub", template: "%s · Sportive Hub" },
  description: "Sportive Hub patient portal and admin dashboard.",
  // Internal app: keep it out of search engines.
  robots: { index: false, follow: false },
  // Installable app: the manifest comes from src/app/manifest.ts; these cover iOS.
  appleWebApp: { capable: true, title: "Sportive Hub", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#595641",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* The lint rule below is about the Pages Router; this root layout wraps every page.
            A plain stylesheet link (as on the public site) keeps the build free of font downloads. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
