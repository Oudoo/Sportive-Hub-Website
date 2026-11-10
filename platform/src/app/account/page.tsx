import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { RevokeSessionsButton } from "@/components/account/RevokeSessionsButton";
import { SetPasswordForm } from "@/components/account/SetPasswordForm";
import { TwoFactorCard } from "@/components/account/TwoFactorCard";
import { LogoutButton } from "@/components/LogoutButton";
import { Badge, Card } from "@/components/ui";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { ROLE_LABELS, formatDateTime } from "@/lib/format";
import { countUnusedRecoveryCodes } from "@/lib/services/auth";
import { isPasswordless } from "@/lib/services/members";

export const metadata: Metadata = { title: "Account" };

/** The signed-in user's own account: who they are, password, two-factor, devices. Any role. */
export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const [recoveryCodesLeft, passwordless] = await Promise.all([user.totpEnabledAt ? countUnusedRecoveryCodes(user.id) : 0, isPasswordless(user.id)]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 md:px-8">
      <p className="mb-2 text-sm">
        <Link href={homeFor(user)} className="text-olive underline underline-offset-4">
          ← Back
        </Link>
      </p>
      <h1 className="text-3xl font-medium tracking-tight">Your account</h1>
      <dl className="mt-4 grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 text-olive">Member code</dt>
          <dd className="font-mono">{user.memberCode}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 text-olive">Role</dt>
          <dd>
            <Badge tone={user.role === "PATIENT" ? "good" : "info"}>{ROLE_LABELS[user.role]}</Badge>
          </dd>
        </div>
        {user.lastLoginAt && (
          <div className="flex gap-2">
            <dt className="w-28 text-olive">Last sign-in</dt>
            <dd>{formatDateTime(user.lastLoginAt)}</dd>
          </div>
        )}
      </dl>

      <Card title="Your details" className="mt-8">
        <ProfileForm profile={{ fullName: user.fullName, phone: user.phone, email: user.email, preferredBranch: user.preferredBranch }} canEditEmail={!passwordless} />
      </Card>

      {passwordless ? (
        <Card title="Add an email & password" className="mt-6">
          <p className="mb-4 text-sm text-olive">You joined with your mobile number, so your wallet link is your key. Adding an email and password lets you sign in from any device as well.</p>
          <SetPasswordForm email={user.email} />
        </Card>
      ) : (
        <>
          <Card title={<span id="two-factor">Two-factor sign-in</span>} className="mt-6">
            <TwoFactorCard enabled={!!user.totpEnabledAt} recoveryCodesLeft={recoveryCodesLeft} isAdmin={user.role !== "PATIENT"} />
          </Card>

          <Card title="Change password" className="mt-6">
            <p className="mb-4 text-sm text-olive">Changing it signs out every other device.</p>
            <ChangePasswordForm />
          </Card>
        </>
      )}

      <Card title="Devices" className="mt-6">
        <p className="mb-4 text-sm text-olive">Lost a phone or used a shared computer? Sign out everywhere; sessions on other devices stop working at once{passwordless ? ", and your old wallet link stops working too (ask the desk for a new one)" : ""}.</p>
        <div className="flex flex-wrap gap-2">
          <RevokeSessionsButton />
          <LogoutButton />
        </div>
      </Card>
    </div>
  );
}
