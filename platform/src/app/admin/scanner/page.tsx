import type { Metadata } from "next";
import { ScannerApp } from "@/components/admin/scanner/ScannerApp";
import { requireStaffPage } from "@/lib/auth/page";

export const metadata: Metadata = { title: "Scanner" };

/**
 * The front-desk scanner. /admin/scanner?code=SHM-XXXXXXXX is what a member's QR encodes,
 * so a phone camera opens this page with the member already loaded.
 */
export default async function ScannerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaffPage("/admin/scanner");
  const params = await searchParams;
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  return <ScannerApp initialCode={code?.slice(0, 200) ?? null} staff={{ id: user.id, role: user.role === "ADMIN" ? "ADMIN" : "STAFF", fullName: user.fullName, preferredBranch: user.preferredBranch }} />;
}
