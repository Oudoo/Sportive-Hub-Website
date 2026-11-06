import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { RevokeSessionsButton } from "@/components/account/RevokeSessionsButton";
import { TwoFactorCard } from "@/components/account/TwoFactorCard";
import { LogoutButton } from "@/components/LogoutButton";
import { Badge, Card } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { countUnusedRecoveryCodes } from "@/lib/services/auth";

export const metadata: Metadata = { title: "Account" };

/** The signed-in user's own account: who they are, password, two-factor, devices. Any role. */
export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const home = user.role === "ADMIN" ? "/admin" : "/portal";
  const recoveryCodesLeft = user.totpEnabledAt ? await countUnusedRecoveryCodes(user.id) : 0;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 md:px-8">
      <p className="mb-2 text-sm">
        <Link href={home} className="text-olive underline underline-offset-4">
          ← Back
        </Link>
      </p>
      <h1 className="text-3xl font-medium tracking-tight">Your account</h1>
      <dl className="mt-4 grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 text-olive">Name</dt>
          <dd>{user.fullName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 text-olive">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 text-olive">Role</dt>
          <dd>
            <Badge tone={user.role === "ADMIN" ? "info" : "good"}>{user.role === "ADMIN" ? "Admin" : "Patient"}</Badge>
          </dd>
        </div>
        {user.lastLoginAt && (
          <div className="flex gap-2">
            <dt className="w-24 text-olive">Last sign-in</dt>
            <dd>{formatDateTime(user.lastLoginAt)}</dd>
          </div>
        )}
      </dl>

      <Card title={<span id="two-factor">Two-factor sign-in</span>} className="mt-8">
        <TwoFactorCard enabled={!!user.totpEnabledAt} recoveryCodesLeft={recoveryCodesLeft} isAdmin={user.role === "ADMIN"} />
      </Card>

      <Card title="Change password" className="mt-6">
        <p className="mb-4 text-sm text-olive">Changing it signs out every other device.</p>
        <ChangePasswordForm />
      </Card>

      <Card title="Devices" className="mt-6">
        <p className="mb-4 text-sm text-olive">Lost a phone or used a shared computer? Sign out everywhere; sessions on other devices stop working at once.</p>
        <div className="flex flex-wrap gap-2">
          <RevokeSessionsButton />
          <LogoutButton />
        </div>
      </Card>
    </div>
  );
}
