import type { Metadata } from "next";
import Link from "next/link";
import { AddSessionForm } from "@/components/admin/AddSessionForm";
import { SessionPaymentControl } from "@/components/admin/SessionPaymentControl";
import { SessionStatusControl } from "@/components/admin/SessionStatusControl";
import { Badge, Card, Empty, PageTitle, Table, Td, Th } from "@/components/ui";
import { prisma } from "@/lib/db";
import { BRANCH_LABELS, REFERRAL_TRIGGER_PHRASE, SESSION_TYPE_LABELS, formatDateTime } from "@/lib/format";
import { getSettings } from "@/lib/loyalty";
import { listSessions } from "@/lib/services/sessions";
import { sessionsQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Sessions" };

const FILTERS = [
  { key: "upcoming", label: "Upcoming", params: { upcoming: "1" } },
  { key: "unpaid", label: "To be paid", params: { unpaid: "1" } },
  { key: "all", label: "All", params: {} },
  { key: "completed", label: "Completed", params: { status: "COMPLETED" } },
  { key: "cancelled", label: "Cancelled", params: { status: "CANCELLED" } },
] as const;

export default async function SessionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = sessionsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : sessionsQuerySchema.parse({});

  const [sessions, patients, settings] = await Promise.all([
    listSessions(query),
    prisma.user.findMany({
      where: { role: "PATIENT", isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    getSettings(),
  ]);

  const activeFilter =
    query.upcoming === "1" ? "upcoming" : query.unpaid === "1" ? "unpaid" : query.status === "COMPLETED" ? "completed" : query.status === "CANCELLED" ? "cancelled" : "all";

  return (
    <>
      <PageTitle lede={`Book, reschedule, close out and record payment for sessions. A referred patient's referrer is paid ${REFERRAL_TRIGGER_PHRASE[settings.referralTrigger]}.`}>
        Sessions
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card title="Add a session">
          <AddSessionForm patients={patients} />
        </Card>

        <Card
          title={`${sessions.total} session${sessions.total === 1 ? "" : "s"}`}
          action={
            <nav aria-label="Filter" className="flex flex-wrap gap-1 text-xs">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={{ pathname: "/admin/sessions", query: f.params }}
                  className={"rounded-full px-3 py-1 " + (activeFilter === f.key ? "bg-olive text-milk" : "text-olive hover:bg-pastel/60")}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          }
        >
          {sessions.items.length === 0 ? (
            <Empty>Nothing here yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Patient</Th>
                  <Th>Service</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.items.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="whitespace-nowrap">{formatDateTime(s.startsAt)}</div>
                      <div className="text-xs text-olive">
                        {s.durationMinutes} min · {BRANCH_LABELS[s.branch]}
                      </div>
                    </Td>
                    <Td>
                      <Link href={`/admin/patients/${s.patient.id}`} className="underline underline-offset-4">
                        {s.patient.fullName}
                      </Link>
                      {s.practitioner && <div className="text-xs text-olive">with {s.practitioner}</div>}
                    </Td>
                    <Td>
                      {SESSION_TYPE_LABELS[s.type]}
                      {s.title && <div className="text-xs text-olive">{s.title}</div>}
                      {s.isComplimentary && (
                        <div className="mt-1">
                          <Badge tone="good">Reward</Badge>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <SessionStatusControl id={s.id} status={s.status} />
                    </Td>
                    <Td>
                      <SessionPaymentControl id={s.id} paidAt={s.paidAt?.toISOString() ?? null} amountPaid={s.amountPaid} paymentMethod={s.paymentMethod} isComplimentary={s.isComplimentary} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {sessions.total > sessions.perPage && (
            <div className="mt-4 flex justify-between text-sm">
              {sessions.page > 1 ? (
                <Link href={{ pathname: "/admin/sessions", query: { ...raw, page: String(sessions.page - 1) } }} className="underline underline-offset-4">
                  Newer
                </Link>
              ) : (
                <span />
              )}
              {sessions.page * sessions.perPage < sessions.total && (
                <Link href={{ pathname: "/admin/sessions", query: { ...raw, page: String(sessions.page + 1) } }} className="underline underline-offset-4">
                  Older
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
