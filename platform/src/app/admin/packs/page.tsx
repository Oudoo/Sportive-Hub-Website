import type { Metadata } from "next";
import Link from "next/link";
import { PackRowActions } from "@/components/admin/packs/PackRowActions";
import { SellPackForm } from "@/components/admin/packs/SellPackForm";
import { TemplatesManager } from "@/components/admin/packs/TemplatesManager";
import { Badge, Card, Empty, PageTitle, Pagination, Table, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/auth/page";
import { COURSE_PACK_STATUS_LABELS, SESSION_TYPE_LABELS, formatDate, formatEgp } from "@/lib/format";
import { jsonify } from "@/lib/json";
import { listPacks, listTemplates, packRemaining } from "@/lib/services/packs";
import { packsQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Course packs" };

const STATUS_TONE = { ACTIVE: "good", COMPLETED: "neutral", EXPIRED: "warn", CANCELLED: "bad" } as const;
const FILTERS = [
  { key: "", label: "Active", status: "ACTIVE" },
  { key: "COMPLETED", label: "Finished" },
  { key: "EXPIRED", label: "Expired" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "ALL", label: "All" },
] as const;

export default async function PacksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaffPage("/admin/packs");
  const raw = await searchParams;
  const parsed = packsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : packsQuerySchema.parse({});
  const filter = typeof raw.status === "string" ? raw.status : "";
  const status = filter === "ALL" ? undefined : filter === "" ? "ACTIVE" : query.status;
  const preselectPatient = typeof raw.patientId === "string" ? raw.patientId : undefined;

  const [packs, templates] = await Promise.all([listPacks({ userId: query.patientId, status, page: query.page, perPage: query.perPage }), listTemplates({ includeInactive: user.role === "ADMIN" })]);

  return (
    <>
      <PageTitle lede="Prepaid bundles: 6 physio sessions, an 8-pack of EMS… Each visit logged from the scanner uses one; the member sees what is left in their wallet.">Course packs</PageTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-6">
          <Card title="Sell a pack">
            <SellPackForm templates={templates.filter((t) => t.isActive).map((t) => ({ id: t.id, name: t.name, type: t.type, sessions: t.sessions, priceEgp: t.priceEgp }))} preselectPatientId={preselectPatient} />
          </Card>
          {user.role === "ADMIN" && (
            <Card title="What the clinic sells">
              <TemplatesManager templates={jsonify(templates)} />
            </Card>
          )}
        </div>

        <Card
          title={`${packs.total} pack${packs.total === 1 ? "" : "s"}`}
          action={
            <nav aria-label="Filter" className="flex flex-wrap gap-1 text-xs">
              {FILTERS.map((f) => (
                <Link key={f.key} href={{ pathname: "/admin/packs", query: f.key ? { status: f.key } : {} }} className={"rounded-full px-3 py-1 " + (filter === f.key ? "bg-olive text-milk" : "text-olive hover:bg-pastel/60")}>
                  {f.label}
                </Link>
              ))}
            </nav>
          }
        >
          {packs.items.length === 0 ? (
            <Empty>No packs here yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Pack</Th>
                  <Th>Sessions</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {packs.items.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/admin/patients/${p.user.id}`} className="font-medium underline underline-offset-4">
                        {p.user.fullName}
                      </Link>
                      <div className="text-xs text-olive">{p.user.phone ?? p.user.memberCode}</div>
                    </Td>
                    <Td>
                      {p.name}
                      <div className="text-xs text-olive">
                        {SESSION_TYPE_LABELS[p.type]} · bought {formatDate(p.purchasedAt)}
                        {p.expiresAt ? ` · until ${formatDate(p.expiresAt)}` : ""}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {p.usedSessions} / {p.totalSessions}
                      <div className="text-xs text-olive">{packRemaining(p)} left</div>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {p.priceEgp !== null ? formatEgp(p.priceEgp) : "—"}
                      <div className="text-xs text-olive">{p.paidAt ? "Paid" : "Not paid"}</div>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status]}>{COURSE_PACK_STATUS_LABELS[p.status]}</Badge>
                    </Td>
                    <Td>
                      <PackRowActions id={p.id} status={p.status} used={p.usedSessions} total={p.totalSessions} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="mt-4">
            <Pagination page={packs.page} total={packs.total} perPage={packs.perPage} href={(page) => `/admin/packs?${new URLSearchParams({ ...(filter ? { status: filter } : {}), page: String(page) })}`} label="packs" />
          </div>
        </Card>
      </div>
    </>
  );
}
