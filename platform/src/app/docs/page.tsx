import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "@/components/ui";
import { getEnv } from "@/lib/env";
import { API_SCOPES } from "@/lib/integrations/apikeys";
import { WEBHOOK_EVENTS } from "@/lib/integrations/events";
import { API_PATHS, API_SCHEMAS } from "@/lib/integrations/openapi";

export const metadata: Metadata = { title: "API documentation" };

const METHOD_TONE: Record<string, string> = {
  get: "bg-pastel text-olive",
  post: "bg-olive text-milk",
  patch: "bg-sand/60 text-charcoal",
  put: "bg-sand/60 text-charcoal",
  delete: "bg-red-100 text-red-900",
};

function SchemaView({ schema, depth = 0 }: { schema: Record<string, unknown>; depth?: number }) {
  if (typeof schema.$ref === "string") return <span className="text-olive">{schema.$ref.split("/").pop()}</span>;
  if (schema.type === "array" && schema.items) {
    return (
      <span>
        array of <SchemaView schema={schema.items as Record<string, unknown>} depth={depth} />
      </span>
    );
  }
  if (schema.type === "object" && schema.properties) {
    const required = (schema.required as string[] | undefined) ?? [];
    return (
      <ul className={depth > 0 ? "ml-4 border-l border-charcoal/10 pl-3" : ""}>
        {Object.entries(schema.properties as Record<string, Record<string, unknown>>).map(([name, prop]) => (
          <li key={name} className="py-0.5">
            <Code>{name}</Code>
            {required.includes(name) && <span className="ml-1 text-[10px] uppercase tracking-wide text-red-800">required</span>}{" "}
            <span className="text-olive">
              {prop.enum ? (prop.enum as string[]).join(" | ") : (prop.type as string) ?? ""}
              {prop.format === "date-time" ? " (ISO 8601)" : ""}
              {prop.nullable ? ", nullable" : ""}
            </span>
            {typeof prop.description === "string" && <span className="text-charcoal/80"> — {prop.description}</span>}
            {(prop.type === "object" && prop.properties) || prop.type === "array" ? (
              <div className="text-xs">
                <SchemaView schema={prop} depth={depth + 1} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return <span className="text-olive">{String(schema.type ?? "")}</span>;
}

/** Human-readable API reference, rendered from the same tables as /api/v1/openapi.json. */
export default function DocsPage() {
  const base = new URL("/api/v1", getEnv().APP_URL).toString();
  const tags = [...new Set(Object.values(API_PATHS).flatMap((ops) => Object.values(ops).map((op) => op.tag)))];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-olive">Sportive Hub</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight">Integration API</h1>
        <p className="mt-3 max-w-2xl text-olive">
          Create patients, sync appointments, award points, redeem rewards and receive webhooks. Base URL <Code>{base}</Code>. Machine-readable spec:{" "}
          <a href="/api/v1/openapi.json" className="underline underline-offset-4">
            openapi.json
          </a>
          .
        </p>
      </header>

      <nav aria-label="Sections" className="mb-10 flex flex-wrap gap-2 text-sm">
        {["Authentication", ...tags, "Webhook deliveries", "Errors", "Schemas"].map((t) => (
          <a key={t} href={`#${t.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-charcoal/20 px-3 py-1 hover:border-charcoal">
            {t}
          </a>
        ))}
      </nav>

      <section id="authentication" className="mb-10 grid gap-3">
        <h2 className="text-2xl font-medium tracking-tight">Authentication</h2>
        <p className="text-sm">
          Every request carries an API key created by an administrator under Integrations: <Code>Authorization: Bearer shk_live_…</Code>. Keys have permissions (scopes); each operation below names the one it needs. Keys can expire and be revoked at any time. Limit: 600 requests per minute per key (HTTP 429 with <Code>Retry-After</Code> when exceeded).
        </p>
        <pre className="overflow-auto rounded-sm bg-charcoal p-4 text-xs text-milk">{`curl ${base}/ping \\
  -H "Authorization: Bearer shk_live_YOUR_KEY"`}</pre>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {Object.entries(API_SCOPES).map(([scope, text]) => (
            <li key={scope}>
              <Code>{scope}</Code> <span className="text-olive">{text}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          Typical flow for a booking system: <Code>POST /patients</Code> when a patient is created (keep the returned invitation link to send them), <Code>POST /sessions</Code> when an appointment is booked, and the same call with <Code>status: &quot;COMPLETED&quot;</Code> when they have been seen. Send your own ids as <Code>externalSource</Code> + <Code>externalId</Code> so repeated calls update instead of duplicating.
        </p>
      </section>

      {tags.map((tag) => (
        <section key={tag} id={tag.toLowerCase().replace(/\s+/g, "-")} className="mb-10">
          <h2 className="mb-4 text-2xl font-medium tracking-tight">{tag}</h2>
          <div className="grid gap-4">
            {Object.entries(API_PATHS).flatMap(([path, ops]) =>
              Object.entries(ops)
                .filter(([, op]) => op.tag === tag)
                .map(([method, op]) => (
                  <article key={method + path} className="rounded-sm border border-charcoal/15 bg-white/60 p-4 md:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-sm px-2 py-0.5 font-mono text-xs uppercase ${METHOD_TONE[method] ?? ""}`}>{method}</span>
                      <code className="font-mono text-sm">{path}</code>
                      <span className="ml-auto text-xs text-olive">{op.scope ? <Code>{op.scope}</Code> : "no key needed"}</span>
                    </div>
                    <h3 className="mt-2 font-medium">{op.summary}</h3>
                    {op.description && <p className="mt-1 text-sm text-charcoal/85">{op.description}</p>}
                    {op.params && op.params.length > 0 && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs uppercase tracking-[0.12em] text-olive">Parameters</div>
                        <ul className="mt-1 grid gap-0.5">
                          {op.params.map((p) => (
                            <li key={p.name}>
                              <Code>{p.name}</Code> <span className="text-olive">({p.in})</span>
                              {p.description ? ` — ${p.description}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {op.body && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs uppercase tracking-[0.12em] text-olive">Request body (JSON)</div>
                        <div className="mt-1">
                          <SchemaView schema={op.body.schema} />
                        </div>
                        {op.body.example ? <pre className="mt-2 overflow-auto rounded-sm bg-charcoal p-3 text-xs text-milk">{JSON.stringify(op.body.example, null, 2)}</pre> : null}
                      </div>
                    )}
                    {op.responses && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs uppercase tracking-[0.12em] text-olive">Responses</div>
                        <ul className="mt-1 grid gap-1">
                          {Object.entries(op.responses).map(([status, r]) => (
                            <li key={status}>
                              <Code>{status}</Code> {r.description}
                              {r.schema ? (
                                <div className="mt-1 text-xs">
                                  <SchemaView schema={r.schema} />
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                )),
            )}
          </div>
        </section>
      ))}

      <section id="webhook-deliveries" className="mb-10 grid gap-3">
        <h2 className="text-2xl font-medium tracking-tight">Webhook deliveries</h2>
        <p className="text-sm">
          A webhook is an HTTPS endpoint of yours that we POST to. Each message is JSON with <Code>id</Code>, <Code>event</Code>, <Code>createdAt</Code> and <Code>data</Code>. Headers: <Code>X-SportiveHub-Event</Code>, <Code>X-SportiveHub-Delivery</Code>, <Code>X-SportiveHub-Timestamp</Code> and <Code>X-SportiveHub-Signature</Code>. Respond with any 2xx within 10 seconds; anything else is retried after 3 s and 15 s, then marked failed (retry from the dashboard or <Code>POST /webhooks/deliveries/{"{id}"}/retry</Code>). Use <Code>id</Code> to ignore duplicates.
        </p>
        <div className="grid gap-1 text-sm sm:grid-cols-2">
          {Object.entries(WEBHOOK_EVENTS).map(([name, text]) => (
            <div key={name}>
              <Code>{name}</Code> <span className="text-olive">{text}</span>
            </div>
          ))}
        </div>
        <h3 className="mt-2 font-medium">Verifying the signature (Node.js)</h3>
        <pre className="overflow-auto rounded-sm bg-charcoal p-4 text-xs text-milk">{`import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(secret, rawBody, signatureHeader) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false; // 5-minute replay window
  const expected = createHmac("sha256", secret).update(\`\${parts.t}.\${rawBody}\`).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}`}</pre>
        <p className="text-sm text-olive">Compute the HMAC over the raw request body exactly as received, before any JSON parsing.</p>
      </section>

      <section id="errors" className="mb-10 grid gap-3">
        <h2 className="text-2xl font-medium tracking-tight">Errors</h2>
        <p className="text-sm">
          Errors are JSON: <Code>{`{ "error": "message", "details": [{ "path": "field", "message": "why" }] }`}</Code>. Status codes: 400 malformed JSON, 401 bad key, 403 missing permission, 404 not found, 409 conflict (duplicate, not enough points, out of stock), 413 body too large, 422 validation failed (see <Code>details</Code>), 429 rate limited.
        </p>
      </section>

      <section id="schemas" className="mb-10">
        <h2 className="mb-4 text-2xl font-medium tracking-tight">Schemas</h2>
        <div className="grid gap-4">
          {Object.entries(API_SCHEMAS).map(([name, schema]) => (
            <article key={name} className="rounded-sm border border-charcoal/15 bg-white/60 p-4 text-sm">
              <h3 className="font-medium">{name}</h3>
              <div className="mt-2">
                <SchemaView schema={schema} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-charcoal/15 pt-6 text-sm text-olive">
        Questions? The clinic manages keys and webhooks under{" "}
        <Link href="/admin/integrations" className="underline underline-offset-4">
          Admin → Integrations
        </Link>
        .
      </footer>
    </div>
  );
}
