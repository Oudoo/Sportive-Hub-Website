import Link from "next/link";
import { Badge, Button, Empty, Input, Table, Td, Th } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { PatientRow } from "@/lib/services/patients";

const TIER_TONE = { Bronze: "neutral", Silver: "warn", Gold: "good" } as const;

/** Server component: search box plus the patient table with points and referral codes. */
export function PatientList({ items, total, page, perPage, q }: { items: PatientRow[]; total: number; page: number; perPage: number; q?: string }) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="grid gap-4">
      <form method="get" action="/admin/patients" className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search name, email, phone or code" className="max-w-sm" aria-label="Search patients" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q && (
          <Link href="/admin/patients" className="self-center text-sm text-olive underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <Empty>{q ? `No patients match “${q}”.` : "No patients yet."}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Patient</Th>
              <Th>Contact</Th>
              <Th className="text-right">Points</Th>
              <Th>Tier</Th>
              <Th>Referral code</Th>
              <Th className="text-right">Referred</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={p.isActive ? "" : "opacity-60"}>
                <Td>
                  <Link href={`/admin/patients/${p.id}`} className="font-medium underline underline-offset-4">
                    {p.fullName}
                  </Link>
                  {!p.isActive && (
                    <div className="mt-1">
                      <Badge tone="bad">Deactivated</Badge>
                    </div>
                  )}
                </Td>
                <Td>
                  <div>{p.email}</div>
                  {p.phone && <div className="text-xs text-olive">{p.phone}</div>}
                </Td>
                <Td className="text-right tabular-nums">{p.loyaltyPoints}</Td>
                <Td>
                  <Badge tone={TIER_TONE[p.tier]}>{p.tier}</Badge>
                </Td>
                <Td className="font-mono text-xs">{p.referralCode}</Td>
                <Td className="text-right tabular-nums">{p._count.referrals}</Td>
                <Td className="whitespace-nowrap">{formatDate(p.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-olive">
            Page {page} of {lastPage} · {total} patients
          </span>
          <div className="flex gap-4">
            {page > 1 && (
              <Link href={{ pathname: "/admin/patients", query: { q, page: String(page - 1) } }} className="underline underline-offset-4">
                Previous
              </Link>
            )}
            {page < lastPage && (
              <Link href={{ pathname: "/admin/patients", query: { q, page: String(page + 1) } }} className="underline underline-offset-4">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
