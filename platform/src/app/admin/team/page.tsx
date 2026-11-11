import type { Metadata } from "next";
import { TeamManager } from "@/components/admin/team/TeamManager";
import { Card, PageTitle } from "@/components/ui";
import { requireAdminPage } from "@/lib/auth/page";
import { jsonify } from "@/lib/json";
import { listTeam } from "@/lib/services/team";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdminPage("/admin/team");
  const team = await listTeam();
  return (
    <>
      <PageTitle lede="Everyone who signs in at the desk has their own account, so the scanner feed and the activity log say who did what. Staff see the scanner, sessions, patients, packs and the WhatsApp list; admins see everything.">
        Team
      </PageTitle>
      <Card>
        <TeamManager team={jsonify(team)} meId={me.id} />
      </Card>
    </>
  );
}
