import type { Metadata } from "next";
import Link from "next/link";
import { ApiKeysPanel } from "@/components/admin/integrations/ApiKeysPanel";
import { WebhooksPanel } from "@/components/admin/integrations/WebhooksPanel";
import { Card, Code, PageTitle } from "@/components/ui";
import { getEnv } from "@/lib/env";
import { API_SCOPES, listApiKeys } from "@/lib/integrations/apikeys";
import { WEBHOOK_EVENTS } from "@/lib/integrations/events";
import { listWebhooks } from "@/lib/services/integrations";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const [keys, hooks] = await Promise.all([listApiKeys(), listWebhooks()]);
  const base = new URL("/api/v1", getEnv().APP_URL).toString();

  return (
    <>
      <PageTitle
        lede="Connect ClinicMind, a booking system, Zapier or your own scripts. Other systems call our API with a key; we call theirs through webhooks."
        action={
          <Link href="/docs" className="inline-flex min-h-10 items-center rounded-sm border border-charcoal px-4 text-xs font-medium uppercase tracking-[0.12em] hover:bg-charcoal hover:text-milk">
            API documentation
          </Link>
        }
      >
        Integrations
      </PageTitle>

      <div className="grid gap-6">
        <Card title="API keys">
          <p className="mb-4 text-sm text-olive">
            Each connected system gets its own key with only the permissions it needs, so it can be revoked on its own. Keys are sent as{" "}
            <Code>Authorization: Bearer shk_live_…</Code> to <Code>{base}</Code>.
          </p>
          <ApiKeysPanel keys={keys.map((k) => ({ ...k, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, expiresAt: k.expiresAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString() }))} scopes={API_SCOPES} />
        </Card>

        <Card title="Webhooks">
          <p className="mb-4 text-sm text-olive">
            We POST a signed JSON message to your endpoint when something happens here. Every message carries <Code>X-SportiveHub-Signature</Code> (HMAC-SHA256 with the endpoint&apos;s secret) so the receiver can verify it came from us. Failed deliveries are retried three times and can be retried again from the log.
          </p>
          <WebhooksPanel hooks={hooks.map((h) => ({ ...h, createdAt: h.createdAt.toISOString(), lastDelivery: h.lastDelivery ? { ...h.lastDelivery, createdAt: h.lastDelivery.createdAt.toISOString() } : null }))} events={WEBHOOK_EVENTS} />
        </Card>

        <Card title="Connecting ClinicMind">
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div className="grid gap-3">
              <p>
                ClinicMind (clinicminds.com) offers Zapier triggers and a &ldquo;Triggers &amp; Actions&rdquo; API for appointment events. Either path ends with a call to our API, so the loyalty programme follows what happens in the clinic automatically.
              </p>
              <ol className="grid list-decimal gap-2 pl-5">
                <li>
                  Create an API key above with the <strong>Booking system / ClinicMind</strong> preset and keep it in Zapier (or your middleware) as a secret.
                </li>
                <li>
                  <strong>New or updated patient in ClinicMind</strong> → <Code>POST {base}/patients</Code> with their email, name, phone, <Code>externalSource: &quot;clinicminds&quot;</Code> and their ClinicMind id as <Code>externalId</Code>. The response includes an invitation link; send it to the patient so they can set a password and see their points.
                </li>
                <li>
                  <strong>Appointment scheduled or rescheduled</strong> → <Code>POST {base}/sessions</Code> with <Code>patientExternalId</Code>, the appointment id as <Code>externalId</Code>, the service name and the start time. Re-sending the same appointment updates it instead of duplicating.
                </li>
                <li>
                  <strong>Appointment completed / checked out</strong> → the same call with <Code>status: &quot;COMPLETED&quot;</Code> (or <Code>PATCH {base}/sessions/ext:clinicminds:&lt;appointment id&gt;</Code>). That awards the patient&apos;s points.
                </li>
                <li>
                  <strong>Payment received</strong> → the same call with <Code>paid: true</Code> (plus <Code>amountPaid</Code> and <Code>paymentMethod</Code> when known). A referred patient&apos;s first paid session is what pays their referrer, so fake sign-ups earn nothing.
                </li>
                <li>
                  <strong>Cancellation / no-show</strong> → the same call with <Code>status: &quot;CANCELLED&quot;</Code> or <Code>&quot;NO_SHOW&quot;</Code>.
                </li>
              </ol>
            </div>
            <div className="grid gap-3">
              <p>Going the other way, add a webhook so ClinicMind, Zapier or a Google Sheet hears from us:</p>
              <ul className="grid list-disc gap-2 pl-5">
                <li>
                  <Code>redemption.created</Code>: a patient claimed a reward; add a note or a discount to their next visit.
                </li>
                <li>
                  <Code>referral.qualified</Code>: thank the referrer with a message.
                </li>
                <li>
                  <Code>patient.created</Code>: a new sign-up from the website; create them in ClinicMind.
                </li>
              </ul>
              <p>
                Start every integration with <Code>GET {base}/ping</Code>: it confirms the key and lists its permissions. The full reference, with request and response examples, is at{" "}
                <Link href="/docs" className="underline underline-offset-4">
                  /docs
                </Link>
                , and the machine-readable spec at <Code>/api/v1/openapi.json</Code> imports straight into Postman.
              </p>
              <p className="text-olive">
                ClinicMind&apos;s own API access is a paid add-on on their side; their support enables it and the token lives in their settings screen. Field names on their side may differ from the example above; map them in Zapier.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
