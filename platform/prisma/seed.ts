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
    },
  });
  console.log(`Created admin ${email}.`);
}

/** The settings row with its defaults (from the schema), created once. */
async function ensureSettings() {
  await prisma.loyaltySettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
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
  await seedDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
