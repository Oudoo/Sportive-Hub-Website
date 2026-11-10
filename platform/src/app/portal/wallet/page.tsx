import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CheckInPrefill } from "@/components/portal/wallet/CheckInDrawer";
import { WalletView } from "@/components/portal/wallet/WalletView";
import { getSessionUser } from "@/lib/auth/session";
import { BRANCH_LABELS } from "@/lib/format";
import { jsonify } from "@/lib/json";
import { getWalletData } from "@/lib/services/wallet";

export const metadata: Metadata = { title: "My wallet" };

type Params = Record<string, string | string[] | undefined>;

/** A room tag or QR opens /portal/wallet?checkin=BRANCH&room=3&via=nfc: one tap confirms the check-in. */
function prefillFrom(params: Params): CheckInPrefill | null {
  const branch = Array.isArray(params.checkin) ? params.checkin[0] : params.checkin;
  if (!branch || !(branch in BRANCH_LABELS)) return null;
  const room = Number(Array.isArray(params.room) ? params.room[0] : params.room);
  const via = Array.isArray(params.via) ? params.via[0] : params.via;
  return { branch: branch as CheckInPrefill["branch"], room: Number.isInteger(room) && room > 0 ? room : null, via: via === "qr" ? "qr" : via === "nfc" ? "nfc" : null };
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal/wallet");
  const params = await searchParams;
  const data = jsonify(await getWalletData(user));
  return <WalletView data={data} prefill={prefillFrom(params)} />;
}
