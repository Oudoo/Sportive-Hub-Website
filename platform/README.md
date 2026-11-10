# Sportive Hub platform

The backend, admin dashboard, patient portal and integration API for Sportive Hub. One Next.js app that serves:

| Area | URL | Who |
|---|---|---|
| Admin dashboard | `/admin` | Staff: overview, sessions, patients, loyalty & referrals, updates, integrations, activity log |
| Patient portal | `/portal` | Patients: points and tier, rewards and vouchers, refer-a-friend, activity, sessions |
| Account | `/account` | Anyone signed in: password, two-factor sign-in, devices |
| Integration API | `/api/v1`, docs at `/docs` | Other systems (ClinicMind, Zapier, scripts) with an API key |
| JSON API | `/api/...` | The two UIs above |

It is separate from the public website in `../public_html/`, which stays a plain static site (its `/rewards` page explains the programme and links here).

## Stack

- **Next.js 16** (App Router, TypeScript): pages, API route handlers and the request guard (`src/proxy.ts`) in one deployable.
- **Prisma 7** with **MySQL/MariaDB**: Hostinger's hosting plans include MySQL, so no extra database service is needed.
- **Auth:** email + password (bcrypt), sessions as signed JWTs in an HttpOnly cookie (`jose`), optional TOTP two-factor (no third-party library), invitation links instead of emailed resets.
- **Validation:** `zod` on every request body and query string.
- **UI:** Tailwind CSS 4 with the brand palette from the website (olive, sand, milk, pastel, charcoal). Installable as a PWA.
- **Tests:** the API and browser checks used before every deploy live in the session scratchpad (`platform-test.py`, 97 checks; `pages-test.js`, 30 checks); `.github/workflows/ci.yml` runs audit, lint, types and build on every push.

Why this shape: Hostinger runs Node.js apps with `app_type: next` on Node 22, the same way the other sites on the account run, and attaches a MySQL database by writing `DATABASE_URL` into the app's environment. A single app means one deploy, one database and one place for business rules.

## Folder map

```
prisma/
  schema.prisma          the data model
  migrations/            SQL migrations, applied on the server with `prisma migrate deploy`
  seed.ts                first admin, the settings row, a starter rewards catalogue (+ demo data with SEED_DEMO=1)
prisma7.config.ts        Prisma CLI config (reads DATABASE_URL from .env)
src/
  proxy.ts               runs before matched requests: body limit, per-IP rate limit, CSRF, login redirects, role gate, CSP nonce
  instrumentation.ts     mirrors errors to stdout on Hostinger (runtime logs)
  app/
    api/auth/            register, login (+ /login/2fa), logout, invite
    api/me/              portal data, password, sessions/revoke, 2fa/*, rewards, redemptions, referrals, activity
    api/admin/           sessions, patients (+ security actions), updates, loyalty/*, integrations/*, activity, overview
    api/v1/              the integration API (API-key auth), openapi.json, events
    admin/               staff pages; admin/loyalty/* has its own tab layout
    portal/              patient pages: home, rewards, refer, activity
    account/ login/ register/ welcome/ docs/ offline/
    r/[code]/            referral short link: counts the click, sets a cookie, opens /register
  lib/
    auth/                password hashing, token signing (session + purpose tokens), cookie session helpers
    security/            limits (rate limiter), crypto (AES-GCM for 2FA secrets), totp, audit log, request helpers
    integrations/        API keys and scopes, webhook events/delivery/signing, payload serializers, OpenAPI spec
    services/            business logic: auth, sessions, patients, rewards, referrals, loyalty-admin, portal, updates, integrations, audit, overview
    loyalty.ts           settings, tiers, points maths, recordPoints, applyReferral, qualifyReferral
    referral.ts          SPORT-XXXXXX and RW-XXXXXXXX codes, links, WhatsApp message
    validation.ts        zod schemas for every input
    http.ts              route() wrapper, HttpError (with headers), JSON helpers, body size limit
    format.ts            labels and date helpers safe to import in the browser
    db.ts                the Prisma client
  components/            React components (ui primitives, forms, admin/, portal/, account/, auth/, pwa/)
  generated/prisma/      Prisma client, generated, not committed
```

Pages read the database through `lib/services` directly (Server Components). Forms call the JSON API. Both go through the same service functions, so rules live in one place. Every service that changes something takes an `ActionContext` (who, from which request) and writes the audit log and the webhook events.

## Run it locally

Needs Node 22 and a MySQL or MariaDB server.

```bash
cd platform
npm install
cp .env.example .env            # then edit DATABASE_URL, AUTH_SECRET, ADMIN_*
```

Create the database and user once (adjust names to match your `.env`):

```sql
CREATE DATABASE sportive_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sportive'@'localhost' IDENTIFIED BY 'sportive-dev-pass';
GRANT ALL PRIVILEGES ON *.* TO 'sportive'@'localhost';   -- `migrate dev` needs to create a temporary shadow database
```

Then:

```bash
npx prisma migrate deploy       # applies migrations
npx prisma generate             # regenerates the client
npx prisma db seed              # admin from ADMIN_EMAIL/ADMIN_PASSWORD, settings, starter rewards (+ demo data if SEED_DEMO=1)
npm run dev                     # http://localhost:3000
```

Demo accounts when `SEED_DEMO=1`: `mariam@example.com`, `omar@example.com`, `nour@example.com`, password `Patient-Demo-2026`.

Other scripts: `npm run build` (production build), `npm run lint`, `npm run typecheck`, `npm run audit` (fails on moderate+ vulnerabilities), `npx prisma studio` (browse the data). To test webhooks against a local receiver, start the app with `WEBHOOK_ALLOW_LOCAL=1`; never set it in production.

### Changing the data model

1. Edit `prisma/schema.prisma`.
2. Generate the SQL: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_name/migration.sql` (from your up-to-date local database), or `npx prisma migrate dev --name name` in an interactive terminal.
3. `npx prisma migrate deploy && npx prisma generate`, commit the migration folder with your code. On the server, the build script applies pending migrations.

## Data model

- **User**: both roles in one table (`role` = `ADMIN` | `PATIENT`). Patients get a unique `referralCode` and may have `referredById`, `referralQualifiedAt` (when their referrer was paid) and `referralClicks`. `loyaltyPoints` is the spendable balance, `lifetimePoints` what was ever earned (drives the tier). Security columns: `sessionVersion`, `failedLogins`, `lockedUntil`, `totpSecret` (encrypted), `totpEnabledAt`, `lastLoginAt`. `externalSource` + `externalId` identify the same person in another system. `passwordHash` and `totpSecret` never leave the server.
- **RecoveryCode**: hashed one-time codes for two-factor sign-in.
- **Session**: an appointment: `type`, `branch`, `startsAt`, `durationMinutes`, `practitioner`, `status`, `notes`, `isComplimentary`, `pointsAwardedAt` (set once attendance points were paid), `paidAt` / `amountPaid` / `paymentMethod` (the payment record; a referred patient's first paid session pays their referrer), `externalSource` + `externalId` (so integrations can re-send without duplicating).
- **LoyaltySettings**: one row with the programme's numbers (see below).
- **Reward**: catalogue entry: `kind`, `value`, `cost`, `minTier`, `stock` (null = unlimited), `isActive`, `sortOrder`.
- **Redemption**: a claimed reward with its voucher `code` (RW-XXXXXXXX), `status` PENDING → FULFILLED | CANCELLED, who handled it.
- **LoyaltyTransaction**: append-only row for every points change, with `reason`, `note`, `referenceId` and `actorId`.
- **Update**: announcement, platform update or health tip; `publishedAt` null = draft.
- **AuditLog**: who did what, when, from where (sign-ins, failures, staff actions, API calls).
- **ApiKey**: name, prefix, SHA-256 hash of the key, scopes, expiry, revocation.
- **Webhook** / **WebhookDelivery**: endpoints, their secret, subscribed events, and every delivery with its response.

## Loyalty rules

Everything is configured under **Admin → Loyalty → Settings** (table `LoyaltySettings`) and read through `getSettings()`; nothing is hard-coded.

| Event | Default | Reason code |
|---|---|---|
| A session is marked completed | +10 base, × tier bonus, × promotion | `SESSION_ATTENDED` |
| You sign up with a friend's code | +25 | `WELCOME_BONUS` |
| A friend you invited qualifies | +50 to you | `REFERRAL_BONUS` |
| Staff add or deduct by hand (note required) | any | `MANUAL_ADJUSTMENT` |
| Staff award a segment (anniversary, win-back) | any | `CAMPAIGN_BONUS` |
| A reward is redeemed | −cost | `REWARD_REDEMPTION` |
| A redemption is cancelled | +cost back | `REDEMPTION_REFUND` |

- **Tiers** by lifetime points: Bronze (0), Silver (300, +25% on session points), Gold (800, +50%). Spending never lowers a tier. Thresholds and bonuses are settings.
- **Referral trigger**: by default the referrer is paid when the friend **pays for their first session** (`FIRST_PAYMENT`), so fake sign-ups and no-shows earn nothing. Staff record the payment from Sessions → **Mark as paid** (amount and method optional), or a booking system sends `paid: true`; the "To be paid" filter lists what is still open. The trigger can be switched to the first attended session or to registration. The welcome bonus is always paid at sign-up. Removing a payment record never takes a referral bonus back.
- **Promotion**: a label, a multiplier (e.g. 200% = double points) and an end date; applies to session points while it runs.
- **Rewards & vouchers**: patients redeem in the portal and get a voucher code to show at the desk (status PENDING); staff fulfil or cancel it under Loyalty → Redemptions. Staff and integrations redeeming on a patient's behalf fulfil immediately. Cancelling refunds the points and restores stock. Rewards can be tier-locked and stock-limited.
- **Campaigns**: award N points to a segment (everyone, Silver+, Gold, active in 30/90 days, inactive 90 days) in one transaction.
- **Referral links**: `/r/SPORT-XXXXXX` counts the open (rate-limited per IP), stores the code in a cookie for 30 days and opens `/register` with it filled in.

Every change goes through `recordPoints()` inside a database transaction: the balance is updated with an atomic increment and the audit row is written in the same transaction, so the two can never disagree, and a deduction below zero rolls back with a 409.

## API

All responses are JSON. Errors look like `{ "error": "message", "details": [{ "path": "field", "message": "..." }] }` with the matching status (400 bad JSON, 401 not signed in, 403 forbidden, 404, 409 conflict, 413 too large, 422 validation, 429 rate limited with `Retry-After`).

Public:

| Method | Path | Body / query | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `fullName, email, password, phone?, referralCode?` | Creates a patient, applies the referral, sets the cookie |
| POST | `/api/auth/login` | `email, password, issueToken?` | Sets the cookie, or returns `{ twoFactorRequired, challenge }` |
| POST | `/api/auth/login/2fa` | `challenge, code` | Second step: app code or recovery code |
| POST | `/api/auth/logout` | | Clears the cookie |
| GET / POST | `/api/auth/invite` | `token` / `token, password` | Who an invitation is for / set the password and sign in |
| GET | `/api/updates` | `page, perPage` | Published updates only. Usable from the public website |
| GET | `/r/:code` | | Referral short link |

Signed in (any role): `GET /api/me`, `POST /api/me/password`, `POST /api/me/sessions/revoke`, `POST /api/me/2fa/{setup,enable,disable,recovery-codes}`, `GET /api/me/rewards`, `POST /api/me/redemptions`, `DELETE /api/me/redemptions/:id`, `GET /api/me/referrals`, `GET /api/me/activity`.

Admin only: `/api/admin/overview`, `/api/admin/sessions[/:id]`, `/api/admin/updates[/:id]`, `/api/admin/patients` (GET, POST creates with an invitation link), `/api/admin/patients/:id` (+ `/points`, `/redeem`, `/invite`, `/security` with `action: unlock | reset-2fa | sign-out-everywhere`), `/api/admin/loyalty/{overview,settings,rewards[/:id],redemptions[/:id],campaign,ledger,referrals}`, `/api/admin/integrations/{keys[/:id],webhooks[/:id][/test|/deliveries],deliveries/:id/retry}`, `/api/admin/activity`.

Integration API (`/api/v1`, `Authorization: Bearer shk_live_...`): patients (list, upsert, lookup, get, update, invite, loyalty, adjust), sessions (list, upsert, get, update, delete), rewards, redemptions, updates, webhooks, settings, ping. The full reference with examples is at **`/docs`**; the OpenAPI 3.1 file at `/api/v1/openapi.json` imports into Postman.

## Integrations (ClinicMind and others)

- **API keys**: Admin → Integrations. Each key has scopes (`patients:read`, `sessions:write`, …), an optional expiry, and can be revoked. Only a SHA-256 hash is stored; the key is shown once.
- **Idempotent sync**: send `externalSource` (e.g. `clinicminds`) and `externalId` with patients and sessions; re-sending updates instead of duplicating. Records can be addressed as `ext:<source>:<id>`.
- **Completing a visit** (`status: "COMPLETED"`) awards the points; **recording the payment** (`paid: true`, optionally `amountPaid` and `paymentMethod`) pays the referrer on a first paid session, exactly as the dashboard does.
- **Webhooks**: HTTPS endpoints receive signed JSON (`X-SportiveHub-Signature: t=…,v1=<HMAC-SHA256>`), three attempts with backoff, delivery log and retry. Events: `patient.created/updated`, `session.created/updated/completed/paid`, `loyalty.points_changed`, `referral.qualified`, `redemption.created/fulfilled/cancelled`, `update.published`, `webhook.test`. Endpoints must be public HTTPS (no private addresses).
- **ClinicMind**: the dashboard's Integrations page has the step-by-step mapping (their Zapier triggers or Triggers & Actions API → our `/patients` and `/sessions` calls).

## Installable app (PWA)

- `src/app/manifest.ts` serves `/manifest.webmanifest` (name, icons in `public/icons/`, standalone display, brand colours). The root layout adds the iOS tags and `apple-touch-icon.png`.
- `public/sw.js` is the service worker, registered in production by `src/components/pwa/PwaRegister.tsx`. It caches only the app shell (the `/offline` page, icons, manifest) and the hashed files under `/_next/static`. Pages and API responses are never cached, so nothing private stays on a shared device.
- An **Install app** button appears in the admin sidebar and the portal header when the browser offers installation. On iPhone, use Share → Add to Home Screen.
- To force every client to drop old caches, bump `VERSION` in `public/sw.js`.

## Security

- **Passwords:** bcrypt, cost 12, at least 10 characters, never returned. Login compares against a dummy hash when the email is unknown, so timing does not reveal which emails exist, and the error message is the same either way.
- **Lockout and rate limits:** five wrong passwords lock an account for 15 minutes (staff can unlock from the patient page). Per-IP and per-email limits on sign-in, registration, invitations and two-factor codes; 600 requests/minute per IP on `/api` and per API key. Limits live in process memory (`src/lib/security/limits.ts`): right for one Node process; move them to Redis if the app is ever scaled out.
- **Sessions:** HS256 JWT (`sub`, `role`, `name`, `sv`, 7-day expiry) signed with `AUTH_SECRET`, in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. `sv` must equal the user's `sessionVersion`: changing the password or pressing **Sign out everywhere** bumps it and every other token dies at once. Login returns the token in the body only when asked (`issueToken: true`).
- **Two-factor sign-in:** TOTP (RFC 6238) compatible with every authenticator app, implemented on Node's crypto; secrets encrypted at rest with AES-256-GCM under a key derived from `AUTH_SECRET`; eight one-time recovery codes stored hashed; codes cannot be replayed within their window. Recommended for every admin (the dashboard nags until it is on). Staff can reset a patient's second factor after verifying who they talk to.
- **Invitations:** accounts created by staff or an integration have no usable password; a one-time link (purpose-bound token, 7 days, dies once used) lets the patient set their own. The same link is the password reset. Purpose tokens are never accepted as sessions.
- **Two gates:** `src/proxy.ts` verifies the token before `/admin`, `/portal`, `/account`, `/api/admin` and `/api/me`, without touching the database. Then every page and route handler calls `getSessionUser()` / `requireAdmin()`, which re-reads the user (active, role, session version).
- **CSRF:** state-changing `/api` requests that carry the cookie must come from the same site (`Sec-Fetch-Site`, or `Origin` matching the host); otherwise 403. Bearer and API-key requests are exempt because browsers never send those automatically.
- **Headers:** a per-request **Content-Security-Policy** with a script nonce and `strict-dynamic` (only scripts we ship can run; no framing, no plugins, no foreign connections), `Strict-Transport-Security` (two years), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cache-Control: no-store` on the API, no `X-Powered-By`.
- **Input:** every body and query string is validated with zod; bodies over 256 KB are refused (1 MB at the proxy); unknown fields are dropped; the API never echoes stack traces.
- **Integrations:** API keys stored hashed, scoped, expirable, revocable; webhook deliveries signed (HMAC-SHA256 with a timestamp against replay); webhook URLs must be public HTTPS (private ranges and localhost refused, credentials in URLs refused).
- **Audit log:** sign-ins, failures, lockouts, two-factor events, password changes, every staff action, every points change and every API-key action, with IP and user agent, under Admin → Activity log.
- **Dependencies:** `npm audit` is clean (the ESLint toolchain's `minimatch` is pinned to a fixed version through an npm override) and CI fails on any moderate+ finding.
- **Secrets** live in environment variables only. `.env` is git-ignored; `.env.example` has placeholders.

Still worth doing later: email delivery (so invitations and resets can be sent automatically rather than on WhatsApp), and automated tests committed to the repo.

## Hosting

The app is live at **https://admin.sportive-hub.com**, a Node.js website on the Hostinger plan, separate from the static site. What exists on the account:

- The website `admin.sportive-hub.com` (its DNS records and SSL were created with it; HTTPS redirect is on).
- A MySQL database attached to it. Hostinger wrote `DATABASE_URL` and `DB_*` into the app's environment variables.
- Environment variables: `AUTH_SECRET`, `APP_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `NODE_ENV`, plus the database ones. Read or change them in hPanel → Websites → admin.sportive-hub.com → Node.js → Environment variables.
- Build settings: Node 22, app type Next.js, build script **`build:hostinger`**, output `.next`. That script runs `prisma generate`, `prisma migrate deploy` and `prisma db seed` before `next build`, so every deploy applies new migrations and keeps the admin account, settings and rewards; there is no separate release step.

### Deploying a new version

The app is not connected to GitHub yet, so a deploy is an upload of the committed source. From the repository root:

```bash
git archive --format=zip -o app_$(date -u +%Y%m%d_%H%M%S).zip HEAD:platform
```

Then either upload that zip in hPanel (Websites → admin.sportive-hub.com → Deployments → upload), or use the Hostinger API: `POST /api/hosting/v1/files/upload-urls` for the website, upload the zip there with the TUS protocol, and `POST .../nodejs/builds` with `source_type: "archive"` and the stored build settings. The build takes about two minutes and publishes itself.

To deploy on every push instead, connect GitHub once in hPanel (Websites → Manage → Advanced → Git) and pick this repository, branch `main`, **root directory `platform`**; there is no API for that first connection.

### If the site shows 503 after a deploy

Every deploy so far came up in a restart loop (the server printed "Ready" and died, over and over) until the app was restarted by hand, once or twice: hPanel → Node.js → Restart, or `POST .../nodejs/server/restart`, then wait 10–30 seconds. The runtime log shows no application error during the loop, so it is the runner's start-up rather than the code. If it keeps happening, it is worth a ticket to Hostinger support.

### Logs

hPanel → Node.js → Runtime logs shows only what the app writes with `console.log`. `src/instrumentation.ts` mirrors errors and crashes to stdout on Hostinger so they appear there too.

### Build notes

Production builds use `next build --webpack`. Hostinger's build environment could not run the helper process Turbopack spawns for CSS transforms, so Tailwind runs through PostCSS (`postcss.config.mjs`) and webpack bundles the app. `next dev` still uses Turbopack. Every page is rendered per request (`connection()` in the root layout) so the CSP nonce is fresh on each response.

The build container also has a low thread limit: once the app grew to 66 routes, a build died with "OS can't spawn worker thread (os error 11)" because Next forks one static-generation worker per CPU core of the host, each loading the SWC native binding with its own thread pools. `build:hostinger` therefore runs `next build` with `LOW_RESOURCE_BUILD=1` (a single worker, see `next.config.ts`) and caps the native pools (`TOKIO_WORKER_THREADS`, `RAYON_NUM_THREADS`, `UV_THREADPOOL_SIZE`). It is slower but fits. Local `npm run build` is unaffected.
