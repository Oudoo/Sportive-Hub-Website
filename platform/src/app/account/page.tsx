import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { LogoutButton } from "@/components/LogoutButton";
import { Badge, Card } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

/** The signed-in user's own account: who they are and a password change. Any role. */
export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const home = user.role === "ADMIN" ? "/admin" : "/portal";

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
          <dt className="w-16 text-olive">Name</dt>
          <dd>{user.fullName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 text-olive">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 text-olive">Role</dt>
          <dd>
            <Badge tone={user.role === "ADMIN" ? "info" : "good"}>{user.role === "ADMIN" ? "Admin" : "Patient"}</Badge>
          </dd>
        </div>
      </dl>

      <Card title="Change password" className="mt-8">
        <ChangePasswordForm />
      </Card>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
