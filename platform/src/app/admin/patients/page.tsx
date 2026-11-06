import type { Metadata } from "next";
import { PatientList } from "@/components/admin/PatientList";
import { Card, PageTitle } from "@/components/ui";
import { listPatients } from "@/lib/services/patients";
import { patientsQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = patientsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : patientsQuerySchema.parse({});
  const result = await listPatients(query);

  return (
    <>
      <PageTitle lede="Profiles, loyalty balances and referral codes. Open a patient to adjust points or redeem a reward.">
        Patients
      </PageTitle>
      <Card>
        <PatientList {...result} q={query.q} />
      </Card>
    </>
  );
}
