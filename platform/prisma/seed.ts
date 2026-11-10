/**
 * Seeds the database. Run with `npx prisma db seed`.
 *
 * - Always: the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME, if missing;
 *   the loyalty settings row; and a starter rewards catalogue if there are no rewards yet.
 * - With SEED_DEMO=1 (never in production): a few patients, sessions, points and an update,
 *   so the dashboard has something to show.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, type LoyaltyReason } from "../src/generated/prisma/client";
import { generateMemberCode } from "../src/lib/member";
import { generateReferralCode } from "../src/lib/referral";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(requireEnv("DATABASE_URL")) });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function ensureAdmin() {
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Admin ${email} already exists, leaving it as is.`);
    return;
  }
  const password = requireEnv("ADMIN_PASSWORD");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: process.env.ADMIN_NAME || "Sportive Hub Admin",
      role: "ADMIN",
      memberCode: generateMemberCode(),
      joinedVia: "seed",
    },
  });
  console.log(`Created admin ${email}.`);
}

/** The settings row with its defaults (from the schema), created once. */
async function ensureSettings() {
  await prisma.loyaltySettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/**
 * The course packs the front desk can sell, from the clinic's public price list.
 * Created once when there are no templates yet; edit prices and names in the dashboard.
 */
async function ensurePackageTemplates() {
  if ((await prisma.packageTemplate.count()) > 0) return;
  await prisma.packageTemplate.createMany({
    data: [
      { name: "Physiotherapy · single area · 6 sessions", type: "PHYSIOTHERAPY", sessions: 6, priceEgp: 4999, sortOrder: 10 },
      { name: "Physiotherapy · single area · 12 sessions", type: "PHYSIOTHERAPY", sessions: 12, priceEgp: 8999, sortOrder: 11 },
      { name: "Physiotherapy · two areas · 6 sessions", type: "PHYSIOTHERAPY", sessions: 6, priceEgp: 7499, sortOrder: 12 },
      { name: "Physiotherapy · two areas · 12 sessions", type: "PHYSIOTHERAPY", sessions: 12, priceEgp: 13499, sortOrder: 13 },
      { name: "EMS · 4 sessions", type: "EMS", sessions: 4, priceEgp: 2599, sortOrder: 20 },
      { name: "EMS · 8 sessions", type: "EMS", sessions: 8, priceEgp: 4799, sortOrder: 21 },
      { name: "EMS · 12 sessions", type: "EMS", sessions: 12, priceEgp: 6599, sortOrder: 22 },
      { name: "EMS · 24 sessions", type: "EMS", sessions: 24, priceEgp: 11999, sortOrder: 23 },
      { name: "Lymphatic drainage · 6 for 5", type: "LYMPHATIC_DRAINAGE", sessions: 6, priceEgp: 7500, description: "Pay for five 60-minute sessions, get six.", sortOrder: 30 },
      { name: "Lymphatic drainage · 12 for 9", type: "LYMPHATIC_DRAINAGE", sessions: 12, priceEgp: 13500, description: "Pay for nine 60-minute sessions, get twelve.", sortOrder: 31 },
      { name: "Women's health · 6 sessions", type: "WOMENS_HEALTH", sessions: 6, priceEgp: 10000, sortOrder: 40 },
      { name: "Women's health · 12 sessions", type: "WOMENS_HEALTH", sessions: 12, priceEgp: 18000, sortOrder: 41 },
      { name: "Psychiatry · 4 sessions", type: "PSYCHIATRY", sessions: 4, priceEgp: 8000, sortOrder: 50 },
      { name: "Psychiatry · 6 sessions", type: "PSYCHIATRY", sessions: 6, priceEgp: 11000, sortOrder: 51 },
      { name: "Psychiatry · 8 sessions", type: "PSYCHIATRY", sessions: 8, priceEgp: 14000, sortOrder: 52 },
    ],
  });
  console.log("Created the course pack templates from the price list.");
}

/** A starter catalogue, only when the clinic has not created any rewards yet. Edit freely in the dashboard. */
async function ensureRewards() {
  if ((await prisma.reward.count()) > 0) return;
  await prisma.reward.createMany({
    data: [
      { name: "One free session", description: "Any 60-minute physiotherapy or EMS session, on us.", kind: "FREE_SESSION", cost: 100, minTier: "BRONZE", sortOrder: 10 },
      { name: "20% off your next package", description: "Applied at the front desk to any package of 4 sessions or more.", kind: "DISCOUNT_PERCENT", value: 20, cost: 60, minTier: "BRONZE", sortOrder: 20 },
      { name: "Free cupping add-on", description: "Added to any physiotherapy session.", kind: "OTHER", cost: 40, minTier: "BRONZE", sortOrder: 30 },
      { name: "IV therapy booster", description: "A vitamin booster shot with your next session. Silver members and above.", kind: "OTHER", cost: 150, minTier: "SILVER", sortOrder: 40 },
      { name: "Gold: bring a friend for free", description: "A complimentary assessment for a friend who has not visited before.", kind: "FREE_SESSION", cost: 120, minTier: "GOLD", sortOrder: 50 },
    ],
  });
  console.log("Created the starter rewards catalogue.");
}

/** Mirrors lib/loyalty recordPoints, kept inline so the seed has no dependency on Next.js modules. */
async function award(userId: string, points: number, reason: LoyaltyReason, note: string, referenceId?: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points }, ...(points > 0 ? { lifetimePoints: { increment: points } } : {}) },
    }),
    prisma.loyaltyTransaction.create({ data: { userId, points, reason, note, referenceId } }),
  ]);
}

async function seedDemo() {
  if (process.env.SEED_DEMO !== "1") return;
  if (process.env.NODE_ENV === "production") {
    console.log("SEED_DEMO is ignored in production.");
    return;
  }
  const alreadySeeded = await prisma.user.findUnique({ where: { email: "mariam@example.com" } });
  if (alreadySeeded) {
    console.log("Demo data already present.");
    return;
  }

  const passwordHash = await bcrypt.hash("Patient-Demo-2026", 12);
  const patient = (fullName: string, email: string, phone: string) => ({
    fullName,
    email,
    phone,
    passwordHash,
    role: "PATIENT" as const,
    referralCode: generateReferralCode(),
    memberCode: generateMemberCode(),
    joinedVia: "seed",
  });

  const mariam = await prisma.user.create({ data: patient("Mariam Adel", "mariam@example.com", "+201000000001") });
  const omar = await prisma.user.create({
    data: { ...patient("Omar Hassan", "omar@example.com", "+201000000002"), referredById: mariam.id, referralQualifiedAt: new Date() },
  });
  const nour = await prisma.user.create({ data: patient("Nour Khaled", "nour@example.com", "+201000000003") });

  await award(mariam.id, 50, "REFERRAL_BONUS", "A friend you invited joined Sportive Hub", omar.id);
  await award(omar.id, 25, "WELCOME_BONUS", "Welcome bonus for joining with a referral code", mariam.id);

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const past = await prisma.session.create({
    data: {
      patientId: mariam.id,
      type: "PHYSIOTHERAPY",
      title: "Knee assessment",
      startsAt: new Date(now - 3 * day),
      practitioner: "Dr. Ahmed Alaa",
      status: "COMPLETED",
      pointsAwardedAt: new Date(now - 3 * day),
      paidAt: new Date(now - 3 * day),
      amountPaid: 900,
      paymentMethod: "CASH",
    },
  });
  await award(mariam.id, 10, "SESSION_ATTENDED", "Attended a session", past.id);

  await prisma.session.createMany({
    data: [
      { patientId: mariam.id, type: "EMS", startsAt: new Date(now + 2 * day), durationMinutes: 20, practitioner: "Coach Sara" },
      { patientId: omar.id, type: "IV_THERAPY", title: "Recovery drip", startsAt: new Date(now + 1 * day), durationMinutes: 45 },
      { patientId: nour.id, type: "LYMPHATIC_DRAINAGE", branch: "ALMAZA_BAY", startsAt: new Date(now + 5 * day), durationMinutes: 60 },
    ],
  });

  // A course pack in progress, so the wallet and the scanner have one to show.
  const emsPack = await prisma.packageTemplate.findFirst({ where: { type: "EMS", sessions: 8 } });
  await prisma.coursePack.create({
    data: {
      userId: mariam.id,
      templateId: emsPack?.id,
      name: emsPack?.name ?? "EMS · 8 sessions",
      type: "EMS",
      totalSessions: 8,
      usedSessions: 3,
      priceEgp: emsPack?.priceEgp ?? 4799,
      paidAt: new Date(now - 20 * day),
      expiresAt: new Date(now + 160 * day),
    },
  });

  // Partner perks for the "My gifts & discounts" shelf. Placeholders: replace with real partners.
  if ((await prisma.partnerOffer.count()) === 0) {
    await prisma.partnerOffer.createMany({
      data: [
        { partnerName: "Demo Café", zone: "SHEIKH_ZAYED", kind: "DISCOUNT", title: "15% off any drink", badge: "-15%", emoji: "☕", description: "Show your coupon at the counter after a session.", terms: "One coupon per visit. Not valid with other offers.", sortOrder: 10 },
        { partnerName: "Demo Sportswear", zone: "ALL", kind: "DISCOUNT", title: "10% off in store", badge: "-10%", emoji: "👟", description: "For Sportive Hub members, on full-price items.", minTier: "SILVER", sortOrder: 20 },
        { partnerName: "Demo Juice Bar", zone: "ALMAZA_BAY", kind: "GIFT", title: "A free recovery smoothie", badge: "Free", emoji: "🥤", description: "One smoothie on the house after your session.", minTier: "GOLD", sortOrder: 30 },
      ],
    });
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  await prisma.update.create({
    data: {
      kind: "HEALTH_TIP",
      title: "Two weeks is the rule",
      body: "Mild stiffness that eases within an hour of exercise is normal. If an ache is not improving after two weeks, book an assessment.",
      publishedAt: new Date(),
      authorId: admin?.id,
    },
  });

  console.log("Seeded demo patients (password: Patient-Demo-2026), sessions and an update.");
}

async function main() {
  await ensureAdmin();
  await ensureSettings();
  await ensureRewards();
  await ensurePackageTemplates();
  await seedDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
