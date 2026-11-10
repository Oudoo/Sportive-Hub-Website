import { API_SCOPES } from "./apikeys";
import { WEBHOOK_EVENTS } from "./events";

/**
 * The OpenAPI 3.1 description of /api/v1, built from code so it cannot drift far
 * from the routes. Served at /api/v1/openapi.json and rendered at /docs.
 * Import it into Postman, Insomnia, or a code generator.
 */

type Schema = Record<string, unknown>;
type Operation = {
  tag: string;
  summary: string;
  description?: string;
  scope?: keyof typeof API_SCOPES | null;
  params?: Array<{ name: string; in: "path" | "query"; description?: string; required?: boolean; schema?: Schema }>;
  body?: { schema: Schema; example?: unknown };
  responses?: Record<string, { description: string; schema?: Schema; example?: unknown }>;
};

const ENUMS = {
  SessionType: ["PHYSIOTHERAPY", "EMS", "IV_THERAPY", "CUPPING", "LYMPHATIC_DRAINAGE", "WOMENS_HEALTH", "PSYCHIATRY", "NUTRITION", "OTHER"],
  SessionStatus: ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  Branch: ["SHEIKH_ZAYED", "ALMAZA_BAY"],
  Tier: ["BRONZE", "SILVER", "GOLD"],
  RedemptionStatus: ["PENDING", "FULFILLED", "CANCELLED", "EXPIRED"],
  PaymentMethod: ["CASH", "CARD", "INSTAPAY", "BANK_TRANSFER", "OTHER"],
  LoyaltyReason: ["REFERRAL_BONUS", "WELCOME_BONUS", "SESSION_ATTENDED", "MANUAL_ADJUSTMENT", "CAMPAIGN_BONUS", "REWARD_REDEMPTION", "REDEMPTION_REFUND", "PAIN_MAP_BONUS", "REVERSAL"],
  UpdateKind: ["ANNOUNCEMENT", "PLATFORM_UPDATE", "HEALTH_TIP"],
  WebhookEvent: Object.keys(WEBHOOK_EVENTS),
};

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const str = (description?: string, extra: Schema = {}): Schema => ({ type: "string", ...(description ? { description } : {}), ...extra });
const int = (description?: string, extra: Schema = {}): Schema => ({ type: "integer", ...(description ? { description } : {}), ...extra });
const bool = (description?: string): Schema => ({ type: "boolean", ...(description ? { description } : {}) });
const dateTime = (description?: string): Schema => ({ type: "string", format: "date-time", ...(description ? { description } : {}) });
const nullable = (schema: Schema): Schema => ({ ...schema, nullable: true });
const obj = (properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const arr = (items: Schema): Schema => ({ type: "array", items });
const paginated = (item: Schema): Schema => obj({ items: arr(item), total: int(), page: int(), perPage: int() });

const schemas: Record<string, Schema> = {
  Error: obj({ error: str("Human-readable message"), details: arr(obj({ path: str(), message: str() })) }, ["error"]),
  Patient: obj({
    id: str(),
    email: nullable(str("Null for members who joined with a phone number only")),
    fullName: str(),
    phone: nullable(str()),
    isActive: bool(),
    referralCode: nullable(str("SPORT-XXXXXX")),
    referredById: nullable(str()),
    referralQualifiedAt: nullable(dateTime()),
    memberCode: str("SHM-XXXXXXXX, what the wallet QR carries"),
    loyaltyPoints: int("Spendable balance"),
    lifetimePoints: int("Everything ever earned; drives the tier"),
    tier: { type: "string", enum: ENUMS.Tier },
    stampCount: int("Stamps on the current card"),
    lastVisitAt: nullable(dateTime()),
    focusArea: nullable(str("From the pain map: neck, knee, lower-back…")),
    preferredBranch: nullable({ type: "string", enum: ENUMS.Branch }),
    externalSource: nullable(str("The other system, e.g. clinicminds")),
    externalId: nullable(str("That system's id for this person")),
    createdAt: dateTime(),
  }),
  PatientUpsert: obj(
    {
      email: str("Required; it is how the patient signs in"),
      fullName: str(),
      phone: nullable(str()),
      externalSource: str("e.g. clinicminds"),
      externalId: str("Their id in that system; makes the call idempotent"),
      referralCode: str("A friend's SPORT- code, honoured on creation only"),
      isActive: bool(),
    },
    ["email", "fullName"],
  ),
  Invite: obj({ url: str("One-time link where the patient sets a password; valid 7 days"), expiresAt: dateTime() }),
  Session: obj({
    id: str(),
    patientId: str(),
    patient: obj({ id: str(), fullName: str(), email: nullable(str()), memberCode: nullable(str()), externalSource: nullable(str()), externalId: nullable(str()) }),
    type: { type: "string", enum: ENUMS.SessionType },
    branch: { type: "string", enum: ENUMS.Branch },
    title: nullable(str()),
    startsAt: dateTime(),
    durationMinutes: int(),
    practitioner: nullable(str()),
    status: { type: "string", enum: ENUMS.SessionStatus },
    notes: nullable(str()),
    isComplimentary: bool(),
    coursePackId: nullable(str("The prepaid pack this session was taken from")),
    coursePack: nullable(obj({ id: str(), name: str(), totalSessions: int(), usedSessions: int(), status: str() })),
    checkInMethod: nullable({ type: "string", enum: ["STAFF_SCAN", "NFC_TAG", "QR_SELF", "MANUAL", "API"] }),
    roomNumber: nullable(int()),
    pointsAwardedAt: nullable(dateTime("Set once attendance points were granted")),
    paidAt: nullable(dateTime("When the session was paid for")),
    amountPaid: nullable(int("EGP, when recorded")),
    paymentMethod: nullable({ type: "string", enum: ENUMS.PaymentMethod }),
    externalSource: nullable(str()),
    externalId: nullable(str()),
    createdAt: dateTime(),
    updatedAt: dateTime(),
  }),
  SessionUpsert: obj(
    {
      patientId: str("Our id"),
      patientEmail: str("Or the patient's email"),
      patientExternalId: str("Or their id in your system (with externalSource)"),
      type: { type: "string", enum: ENUMS.SessionType },
      service: str("Free text such as 'Physiotherapy assessment'; mapped onto `type` when `type` is absent"),
      branch: { type: "string", enum: ENUMS.Branch, default: "SHEIKH_ZAYED" },
      title: str(),
      startsAt: dateTime(),
      durationMinutes: int(undefined, { default: 60 }),
      practitioner: str(),
      notes: str(),
      isComplimentary: bool(),
      status: { type: "string", enum: ENUMS.SessionStatus, default: "SCHEDULED", description: "COMPLETED awards points immediately" },
      paid: bool("true records the payment (now, or at paidAt). A referred patient's first paid session pays their referrer."),
      paidAt: dateTime("When the payment happened; defaults to now"),
      amountPaid: int("EGP, whole number, optional"),
      paymentMethod: { type: "string", enum: ENUMS.PaymentMethod },
      externalSource: str(),
      externalId: str("The appointment id in your system; sending the same one twice updates instead of duplicating"),
    },
    ["startsAt"],
  ),
  SessionUpdate: obj({
    type: { type: "string", enum: ENUMS.SessionType },
    branch: { type: "string", enum: ENUMS.Branch },
    title: str(),
    startsAt: dateTime(),
    durationMinutes: int(),
    practitioner: str(),
    notes: str(),
    isComplimentary: bool(),
    status: { type: "string", enum: ENUMS.SessionStatus },
    paid: bool("true records the payment; false removes it"),
    paidAt: dateTime(),
    amountPaid: nullable(int()),
    paymentMethod: nullable({ type: "string", enum: ENUMS.PaymentMethod }),
    externalSource: str(),
    externalId: str(),
  }),
  Transaction: obj({
    id: str(),
    points: int("Positive earned, negative spent"),
    reason: { type: "string", enum: ENUMS.LoyaltyReason },
    note: nullable(str()),
    referenceId: nullable(str()),
    createdAt: dateTime(),
  }),
  Loyalty: obj({
    patientId: str(),
    balance: int(),
    lifetimePoints: int(),
    tier: obj({ key: { type: "string", enum: ENUMS.Tier }, name: str(), bonusPercent: int(), progress: { type: "number" }, next: nullable(obj({ key: str(), name: str(), min: int(), pointsToGo: int() })) }),
    referralCode: nullable(str()),
    pendingVouchers: arr(obj({ id: str(), code: str(), rewardName: str(), pointsSpent: int(), createdAt: dateTime() })),
    transactions: arr(ref("Transaction")),
  }),
  PointsChange: obj({
    patientId: str(),
    transactionId: str(),
    points: int(),
    reason: { type: "string", enum: ENUMS.LoyaltyReason },
    note: nullable(str()),
    balance: int("Balance after the change"),
    lifetimePoints: int(),
    createdAt: dateTime(),
  }),
  Reward: obj({
    id: str(),
    name: str(),
    description: nullable(str()),
    kind: { type: "string", enum: ["FREE_SESSION", "DISCOUNT_PERCENT", "DISCOUNT_AMOUNT", "PRODUCT", "OTHER"] },
    value: nullable(int("Percent or EGP, depending on kind")),
    cost: int("Points"),
    minTier: { type: "string", enum: ENUMS.Tier },
    stock: nullable(int("Null = unlimited")),
    isActive: bool(),
    sortOrder: int(),
    timesRedeemed: int(),
  }),
  Redemption: obj({
    id: str(),
    code: str("Voucher code the patient shows at the desk, e.g. RW-7KQ2MXP4"),
    patientId: str(),
    patient: obj({ id: str(), fullName: str(), email: nullable(str()), memberCode: nullable(str()) }),
    rewardId: str(),
    rewardName: str(),
    pointsSpent: int(),
    status: { type: "string", enum: ENUMS.RedemptionStatus },
    note: nullable(str()),
    createdAt: dateTime(),
    fulfilledAt: nullable(dateTime()),
    cancelledAt: nullable(dateTime()),
  }),
  Pack: obj({
    id: str(),
    patientId: str(),
    patient: obj({ id: str(), fullName: str(), memberCode: str() }),
    templateId: nullable(str()),
    name: str("e.g. EMS · 8 sessions"),
    type: { type: "string", enum: ENUMS.SessionType },
    totalSessions: int(),
    usedSessions: int(),
    remaining: int(),
    priceEgp: nullable(int()),
    paidAt: nullable(dateTime()),
    paymentMethod: nullable({ type: "string", enum: ENUMS.PaymentMethod }),
    status: { type: "string", enum: ["ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"] },
    purchasedAt: dateTime(),
    expiresAt: nullable(dateTime()),
    notes: nullable(str()),
  }),
  PackSell: obj(
    {
      patientId: str(),
      templateId: str("A pack from the clinic's price list (GET /api/admin/packs/templates in the dashboard). Or describe a custom pack with name, type and sessions."),
      name: str(),
      type: { type: "string", enum: ENUMS.SessionType },
      sessions: int(),
      priceEgp: int(),
      paid: bool(),
      paymentMethod: { type: "string", enum: ENUMS.PaymentMethod },
      expiresInDays: int(),
      notes: str(),
    },
    ["patientId"],
  ),
  Update: obj({ id: str(), kind: { type: "string", enum: ENUMS.UpdateKind }, title: str(), body: str(), publishedAt: nullable(dateTime()) }),
  Webhook: obj({
    id: str(),
    name: str(),
    url: str(),
    events: arr({ type: "string", enum: [...ENUMS.WebhookEvent, "*"] }),
    isActive: bool(),
    description: nullable(str()),
    createdAt: dateTime(),
    lastDelivery: nullable(obj({ status: str(), createdAt: dateTime(), responseStatus: nullable(int()) })),
    failedCount: int(),
  }),
  WebhookCreate: obj(
    {
      name: str(),
      url: str("https:// only, reachable from the internet"),
      events: arr({ type: "string", enum: [...ENUMS.WebhookEvent, "*"] }),
      description: str(),
      isActive: bool(),
    },
    ["name", "url", "events"],
  ),
  Delivery: obj({
    id: str(),
    webhookId: str(),
    event: str(),
    payload: { type: "object" },
    status: { type: "string", enum: ["PENDING", "SUCCESS", "FAILED"] },
    attempts: int(),
    responseStatus: nullable(int()),
    responseBody: nullable(str("First kilobyte")),
    lastError: nullable(str()),
    deliveredAt: nullable(dateTime()),
    createdAt: dateTime(),
  }),
  WebhookEnvelope: obj({
    id: str("Delivery id; use it to de-duplicate"),
    event: { type: "string", enum: ENUMS.WebhookEvent },
    createdAt: dateTime(),
    data: { type: "object", description: "Event-specific: `patient`, `session`, `redemption`, or the PointsChange fields" },
  }),
};

const paths: Record<string, Record<string, Operation>> = {
  "/ping": {
    get: { tag: "Getting started", summary: "Check your key", description: "Returns the key's name and permissions, the time, and the IP address we saw. Make this call first.", scope: null, responses: { "200": { description: "OK", schema: obj({ ok: bool(), key: obj({ id: str(), name: str(), scopes: arr(str()) }), clientIp: str(), time: dateTime() }) } } },
  },
  "/settings": {
    get: { tag: "Getting started", summary: "Programme rules", description: "Points per session, bonuses, tier thresholds and any running promotion.", scope: "loyalty:read", responses: { "200": { description: "OK" } } },
  },
  "/patients": {
    get: {
      tag: "Patients",
      summary: "List or search patients",
      scope: "patients:read",
      params: [
        { name: "q", in: "query", description: "Name, email, phone, referral code or external id" },
        { name: "page", in: "query", schema: int(undefined, { default: 1 }) },
        { name: "perPage", in: "query", schema: int(undefined, { default: 25, maximum: 100 }) },
      ],
      responses: { "200": { description: "OK", schema: paginated(ref("Patient")) } },
    },
    post: {
      tag: "Patients",
      summary: "Create or update a patient",
      description:
        "Matched by `externalSource` + `externalId` first, then by email. New patients are created without a password; the response carries a one-time invitation link to send them (WhatsApp works well). Re-sending the same person is safe.",
      scope: "patients:write",
      body: { schema: ref("PatientUpsert"), example: { email: "mariam@example.com", fullName: "Mariam Adel", phone: "+201000000001", externalSource: "clinicminds", externalId: "cm_12345" } },
      responses: {
        "201": { description: "Created", schema: obj({ patient: ref("Patient"), created: bool(), invite: nullable(ref("Invite")) }) },
        "200": { description: "Updated", schema: obj({ patient: ref("Patient"), created: bool(), invite: nullable(ref("Invite")) }) },
      },
    },
  },
  "/patients/lookup": {
    get: {
      tag: "Patients",
      summary: "Find one patient",
      scope: "patients:read",
      params: [
        { name: "email", in: "query" },
        { name: "phone", in: "query" },
        { name: "referralCode", in: "query" },
        { name: "externalSource", in: "query" },
        { name: "externalId", in: "query" },
      ],
      responses: { "200": { description: "OK", schema: obj({ patient: ref("Patient") }) }, "404": { description: "No such patient" } },
    },
  },
  "/patients/{id}": {
    get: { tag: "Patients", summary: "Get a patient", description: "`id` is our id, or `ext:<source>:<externalId>`.", scope: "patients:read", params: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "OK", schema: obj({ patient: ref("Patient") }) } } },
    patch: {
      tag: "Patients",
      summary: "Update a patient",
      scope: "patients:write",
      params: [{ name: "id", in: "path", required: true }],
      body: { schema: obj({ fullName: str(), phone: nullable(str()), isActive: bool(), externalSource: nullable(str()), externalId: nullable(str()) }) },
      responses: { "200": { description: "OK", schema: obj({ patient: ref("Patient") }) } },
    },
  },
  "/patients/{id}/invite": {
    post: { tag: "Patients", summary: "Create an invitation link", description: "A one-time link where the patient sets (or resets) their password. Valid for 7 days.", scope: "patients:write", params: [{ name: "id", in: "path", required: true }], responses: { "201": { description: "Created", schema: ref("Invite") } } },
  },
  "/patients/{id}/loyalty": {
    get: { tag: "Loyalty", summary: "Balance, tier and history", scope: "loyalty:read", params: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "OK", schema: ref("Loyalty") } } },
  },
  "/patients/{id}/loyalty/adjust": {
    post: {
      tag: "Loyalty",
      summary: "Add or deduct points",
      description: "Every change needs a note; it appears in the patient's history and in the audit log.",
      scope: "loyalty:write",
      params: [{ name: "id", in: "path", required: true }],
      body: { schema: obj({ points: int("Positive adds, negative deducts; never zero"), note: str() }, ["points", "note"]), example: { points: 20, note: "Thank you for the Google review" } },
      responses: { "200": { description: "OK", schema: obj({ transaction: ref("Transaction"), balance: int(), lifetimePoints: int() }) }, "409": { description: "Not enough points to deduct" } },
    },
  },
  "/sessions": {
    get: {
      tag: "Sessions",
      summary: "List sessions",
      scope: "sessions:read",
      params: [
        { name: "patientId", in: "query" },
        { name: "status", in: "query", schema: { type: "string", enum: ENUMS.SessionStatus } },
        { name: "from", in: "query", schema: dateTime() },
        { name: "to", in: "query", schema: dateTime() },
        { name: "externalSource", in: "query" },
        { name: "upcoming", in: "query", description: "1 = scheduled sessions that have not started" },
        { name: "page", in: "query" },
        { name: "perPage", in: "query" },
      ],
      responses: { "200": { description: "OK", schema: paginated(ref("Session")) } },
    },
    post: {
      tag: "Sessions",
      summary: "Create or update a session",
      description:
        "The main call for a booking system. Identify the patient by our id, their email, or your id for them. Send your appointment id as `externalId` so re-sends update instead of duplicating. Send `status: \"COMPLETED\"` when the patient has been seen: that awards their points (base × tier bonus × promotion). Send `paid: true` (with `amountPaid` and `paymentMethod` if you have them) when the payment is received: a referred patient's first paid session is what pays their referrer.",
      scope: "sessions:write",
      body: {
        schema: ref("SessionUpsert"),
        example: { patientExternalId: "cm_12345", externalSource: "clinicminds", externalId: "appt_98765", service: "Physiotherapy session", startsAt: "2026-11-12T10:00:00+02:00", durationMinutes: 60, practitioner: "Dr. Ahmed Alaa", status: "COMPLETED", paid: true, amountPaid: 1200, paymentMethod: "CARD" },
      },
      responses: {
        "201": { description: "Created", schema: obj({ session: ref("Session"), created: bool() }) },
        "200": { description: "Updated", schema: obj({ session: ref("Session"), created: bool() }) },
        "422": { description: "Unknown patient or invalid fields", schema: ref("Error") },
      },
    },
  },
  "/sessions/{id}": {
    get: { tag: "Sessions", summary: "Get a session", description: "`id` is our id, or `ext:<source>:<externalId>`.", scope: "sessions:read", params: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "OK", schema: obj({ session: ref("Session") }) } } },
    patch: { tag: "Sessions", summary: "Update a session", description: "Setting `status: \"COMPLETED\"` awards points the first time; `paid: true` records the payment (and qualifies a referral) the first time.", scope: "sessions:write", params: [{ name: "id", in: "path", required: true }], body: { schema: ref("SessionUpdate"), example: { status: "COMPLETED", paid: true, amountPaid: 1200, paymentMethod: "INSTAPAY" } }, responses: { "200": { description: "OK", schema: obj({ session: ref("Session") }) } } },
    delete: { tag: "Sessions", summary: "Delete a session", description: "Points already awarded are kept.", scope: "sessions:write", params: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "OK" } } },
  },
  "/rewards": {
    get: { tag: "Loyalty", summary: "Rewards catalogue", scope: "loyalty:read", responses: { "200": { description: "OK", schema: obj({ items: arr(ref("Reward")) }) } } },
  },
  "/redemptions": {
    get: {
      tag: "Loyalty",
      summary: "List vouchers",
      scope: "loyalty:read",
      params: [
        { name: "status", in: "query", schema: { type: "string", enum: ENUMS.RedemptionStatus } },
        { name: "q", in: "query", description: "Voucher code or patient name/email" },
        { name: "patientId", in: "query" },
        { name: "page", in: "query" },
      ],
      responses: { "200": { description: "OK", schema: paginated(ref("Redemption")) } },
    },
    post: {
      tag: "Loyalty",
      summary: "Redeem a reward for a patient",
      description: "Deducts the points and issues a voucher (fulfilled immediately when done by staff or an integration).",
      scope: "loyalty:write",
      body: { schema: obj({ patientId: str(), rewardId: str(), note: str() }, ["patientId", "rewardId"]) },
      responses: { "201": { description: "Created", schema: obj({ redemption: ref("Redemption"), balance: int() }) }, "409": { description: "Not enough points, wrong tier, or out of stock" } },
    },
  },
  "/redemptions/{id}": {
    get: { tag: "Loyalty", summary: "Get a voucher", scope: "loyalty:read", params: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "OK", schema: obj({ redemption: ref("Redemption") }) } } },
    patch: {
      tag: "Loyalty",
      summary: "Fulfil or cancel a voucher",
      description: "Cancelling refunds the points and restores stock.",
      scope: "loyalty:write",
      params: [{ name: "id", in: "path", required: true }],
      body: { schema: obj({ status: { type: "string", enum: ["FULFILLED", "CANCELLED"] }, note: str() }, ["status"]) },
      responses: { "200": { description: "OK", schema: obj({ redemption: ref("Redemption") }) } },
    },
  },
  "/packs": {
    get: {
      tag: "Loyalty",
      summary: "List course packs",
      description: "Prepaid session bundles. Each completed session logged with `coursePackId` uses one; at zero the pack completes.",
      scope: "loyalty:read",
      params: [
        { name: "patientId", in: "query" },
        { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"] } },
        { name: "page", in: "query", schema: int(undefined, { default: 1 }) },
        { name: "perPage", in: "query", schema: int(undefined, { default: 25, maximum: 100 }) },
      ],
      responses: { "200": { description: "OK", schema: paginated(ref("Pack")) } },
    },
    post: {
      tag: "Loyalty",
      summary: "Record a pack sold",
      description: "A pack bought in another system. The member sees it in their wallet at once; the front desk takes sessions from it in the scanner.",
      scope: "loyalty:write",
      body: { schema: ref("PackSell"), example: { patientId: "ext:clinicminds:cm_12345", name: "EMS · 8 sessions", type: "EMS", sessions: 8, priceEgp: 4799, paid: true, paymentMethod: "CARD", expiresInDays: 180 } },
      responses: { "201": { description: "Created", schema: obj({ pack: ref("Pack") }) } },
    },
  },
  "/updates": {
    get: { tag: "Updates", summary: "Published updates", scope: "updates:read", params: [{ name: "page", in: "query" }], responses: { "200": { description: "OK", schema: paginated(ref("Update")) } } },
    post: { tag: "Updates", summary: "Post an update", scope: "updates:write", body: { schema: obj({ kind: { type: "string", enum: ENUMS.UpdateKind }, title: str(), body: str(), publish: bool() }, ["title", "body"]) }, responses: { "201": { description: "Created", schema: obj({ update: ref("Update") }) } } },
  },
  "/webhooks": {
    get: { tag: "Webhooks", summary: "List webhooks", scope: "webhooks:manage", responses: { "200": { description: "OK", schema: obj({ items: arr(ref("Webhook")), events: { type: "object" } }) } } },
    post: {
      tag: "Webhooks",
      summary: "Create a webhook",
      description: "The response includes the signing `secret` once. Store it: every delivery is signed with it.",
      scope: "webhooks:manage",
      body: { schema: ref("WebhookCreate"), example: { name: "ClinicMind sync", url: "https://hooks.example.com/sportive", events: ["session.completed", "redemption.created"] } },
      responses: { "201": { description: "Created", schema: obj({ webhook: ref("Webhook"), secret: str() }) } },
    },
  },
  "/webhooks/{id}": {
    patch: { tag: "Webhooks", summary: "Update a webhook", scope: "webhooks:manage", params: [{ name: "id", in: "path", required: true }], body: { schema: ref("WebhookCreate") }, responses: { "200": { description: "OK", schema: ref("Webhook") } } },
    delete: { tag: "Webhooks", summary: "Delete a webhook", scope: "webhooks:manage", params: [{ name: "id", in: "path", required: true }], responses: { "200": { description: "OK" } } },
  },
  "/webhooks/{id}/test": {
    post: { tag: "Webhooks", summary: "Send a test event", scope: "webhooks:manage", params: [{ name: "id", in: "path", required: true }], responses: { "202": { description: "Queued", schema: obj({ deliveryId: str() }) } } },
  },
  "/webhooks/{id}/deliveries": {
    get: { tag: "Webhooks", summary: "Delivery log", scope: "webhooks:manage", params: [{ name: "id", in: "path", required: true }, { name: "page", in: "query" }], responses: { "200": { description: "OK", schema: paginated(ref("Delivery")) } } },
  },
  "/webhooks/deliveries/{id}/retry": {
    post: { tag: "Webhooks", summary: "Retry a delivery", scope: "webhooks:manage", params: [{ name: "id", in: "path", required: true }], responses: { "202": { description: "Queued" } } },
  },
  "/events": {
    get: { tag: "Webhooks", summary: "Event catalogue", description: "Every event name with a description, and how deliveries are signed. No key needed.", scope: null, responses: { "200": { description: "OK" } } },
  },
};

function toOpenApiOperation(op: Operation) {
  return {
    tags: [op.tag],
    summary: op.summary,
    ...(op.description ? { description: op.description } : {}),
    ...(op.scope === null ? { security: [] } : {}),
    "x-scope": op.scope ?? null,
    parameters: (op.params ?? []).map((p) => ({ name: p.name, in: p.in, required: p.in === "path" ? true : !!p.required, ...(p.description ? { description: p.description } : {}), schema: p.schema ?? { type: "string" } })),
    ...(op.body ? { requestBody: { required: true, content: { "application/json": { schema: op.body.schema, ...(op.body.example ? { example: op.body.example } : {}) } } } } : {}),
    responses: {
      ...Object.fromEntries(
        Object.entries(op.responses ?? { "200": { description: "OK" } }).map(([status, r]) => [status, { description: r.description, ...(r.schema ? { content: { "application/json": { schema: r.schema, ...(r.example ? { example: r.example } : {}) } } } : {}) }]),
      ),
      "401": { description: "Missing, revoked or expired API key", content: { "application/json": { schema: ref("Error") } } },
      "403": { description: "The key lacks the required permission", content: { "application/json": { schema: ref("Error") } } },
      "429": { description: "Rate limit hit (600 calls per minute per key)", content: { "application/json": { schema: ref("Error") } } },
    },
  };
}

export function buildOpenApiSpec(appUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Sportive Hub Integration API",
      version: "1.0.0",
      description:
        "Connect a booking system, ClinicMind, Zapier or your own scripts to the Sportive Hub loyalty platform. Create patients, sync appointments, award points, redeem rewards and receive signed webhooks when things happen.\n\nAuthenticate every call with `Authorization: Bearer shk_live_...`. Keys are created in the admin dashboard under Integrations and carry the permissions listed on each operation.",
    },
    servers: [{ url: new URL("/api/v1", appUrl).toString().replace(/\/$/, "") }],
    tags: [
      { name: "Getting started" },
      { name: "Patients" },
      { name: "Sessions" },
      { name: "Loyalty" },
      { name: "Updates" },
      { name: "Webhooks" },
    ],
    security: [{ apiKey: [] }],
    components: {
      securitySchemes: {
        apiKey: { type: "http", scheme: "bearer", bearerFormat: "shk_live_...", description: Object.entries(API_SCOPES).map(([scope, text]) => `\`${scope}\`: ${text}`).join("\n") },
      },
      schemas,
    },
    paths: Object.fromEntries(Object.entries(paths).map(([path, ops]) => [path, Object.fromEntries(Object.entries(ops).map(([method, op]) => [method, toOpenApiOperation(op)]))])),
    "x-webhook-events": WEBHOOK_EVENTS,
    "x-webhook-envelope": schemas.WebhookEnvelope,
  };
}

/** The raw operation table, for the /docs page. */
export const API_PATHS = paths;
export const API_SCHEMAS = schemas;
