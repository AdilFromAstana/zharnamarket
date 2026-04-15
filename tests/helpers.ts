import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/auth";

// ─── Unique suffix to avoid collisions between test runs ────────────────────
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let counter = 0;

function uniqueEmail(prefix: string): string {
  return `${prefix}_${runId}_${++counter}@test.local`;
}

// ─── Create a regular test user in DB and return user + token ───────────────
export async function createTestUser(overrides: { name?: string; phone?: string } = {}) {
  const email = uniqueEmail("user");
  const password = "TestPass123!";
  const hashedPassword = await bcrypt.hash(password, 4); // low cost for speed

  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email,
      phone: overrides.phone ?? null,
      password: hashedPassword,
      role: "user",
      emailVerified: true,
    },
  });

  const token = await signAccessToken({ sub: user.id, email: user.email, role: "user" });

  return { user, token, password, email };
}

// ─── Create an admin test user in DB and return user + token ────────────────
export async function createAdminUser(overrides: { name?: string } = {}) {
  const email = uniqueEmail("admin");
  const password = "AdminPass123!";
  const hashedPassword = await bcrypt.hash(password, 4);

  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? "Test Admin",
      email,
      password: hashedPassword,
      role: "admin",
      emailVerified: true,
    },
  });

  const token = await signAccessToken({ sub: user.id, email: user.email, role: "admin" });

  return { user, token, password, email };
}

// ─── Build a NextRequest with optional JSON body and auth header ────────────
export function buildRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, token, headers = {} } = options;

  const hdrs: Record<string, string> = {
    "content-type": "application/json",
    // Fake IP to avoid rate-limiter conflicts between tests
    "x-forwarded-for": `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    ...headers,
  };

  if (token) {
    hdrs["authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers: hdrs,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
}

// ─── Track created IDs for cleanup ──────────────────────────────────────────
const createdUserIds: string[] = [];
const createdPromoCodeIds: string[] = [];

export function trackUser(id: string) {
  createdUserIds.push(id);
}

export function trackPromoCode(id: string) {
  createdPromoCodeIds.push(id);
}

// ─── Cleanup: delete all test-created data ──────────────────────────────────
// Call this in afterAll() blocks
export async function cleanup() {
  // Delete promo code usages first (FK constraint)
  if (createdPromoCodeIds.length > 0) {
    await prisma.promoCodeUsage.deleteMany({
      where: { promoCodeId: { in: createdPromoCodeIds } },
    });
    await prisma.promoCode.deleteMany({
      where: { id: { in: createdPromoCodeIds } },
    });
    createdPromoCodeIds.length = 0;
  }

  // Delete users (cascades to most relations)
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    createdUserIds.length = 0;
  }
}

// ─── Escrow Fixtures ─────────────────────────────────────────────────────────

/** Create a minimal active escrow Ad with an EscrowAccount */
export async function createEscrowAd(
  ownerId: string,
  overrides: {
    rpm?: number;
    totalBudget?: number;
    minViews?: number;
    maxViewsPerCreator?: number;
    submissionDeadline?: Date;
    status?: string;
  } = {},
) {
  const deadline = overrides.submissionDeadline ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const budget = overrides.totalBudget ?? 50_000;
  const rpm = overrides.rpm ?? 150;

  const [cityRec, categoryRec] = await Promise.all([
    prisma.city.upsert({
      where: { key: "Almaty" },
      update: {},
      create: { key: "Almaty", label: "Алматы" },
    }),
    prisma.category.upsert({
      where: { key: "Obzory" },
      update: {},
      create: { key: "Obzory", label: "Обзоры" },
    }),
  ]);

  const ad = await prisma.ad.create({
    data: {
      ownerId,
      title: "Test Escrow Ad",
      description: "Integration test escrow task description",
      platform: "TikTok",
      cityId: cityRec.id,
      categoryId: categoryRec.id,
      status: (overrides.status ?? "active") as "active",
      budgetType: "per_views",
      paymentMode: "escrow",
      rpm,
      minViews: overrides.minViews ?? 1000,
      maxViewsPerCreator: overrides.maxViewsPerCreator ?? null,
      totalBudget: budget,
      submissionDeadline: deadline,
    },
  });

  const escrow = await prisma.escrowAccount.create({
    data: {
      adId: ad.id,
      initialAmount: budget,
      available: budget,
      spentAmount: 0,
      reservedAmount: 0,
      status: "active",
    },
  });

  return { ad, escrow };
}

/** Create a TaskApplication with optional contentStatus and extra fields */
export async function createApplication(
  adId: string,
  creatorId: string,
  contentStatus:
    | "pending_video"
    | "video_timed_out"
    | "pending_review"
    | "content_approved"
    | "content_rejected" = "content_approved",
  extra?: {
    videoUrl?: string | null;
    videoDeadline?: Date | null;
    videoSubmittedAt?: Date | null;
    contentReviewDeadline?: Date | null;
    contentReviewedAt?: Date | null;
    contentRejectionNote?: string | null;
  },
) {
  return prisma.taskApplication.create({
    data: { adId, creatorId, contentStatus, ...extra },
  });
}

/** Create a VideoSubmission in submitted status with escrow reservation */
export async function createSubmission(
  application: { id: string; adId: string },
  creatorId: string,
  opts: {
    claimedViews?: number;
    reservedAmount?: number;
    videoUrl?: string;
    status?: string;
  } = {},
) {
  const claimedViews = opts.claimedViews ?? 50_000;
  const reservedAmount = opts.reservedAmount ?? (claimedViews / 1000) * 150;

  // Reserve in escrow
  if (opts.status !== "approved" && opts.status !== "rejected") {
    await prisma.escrowAccount.update({
      where: { adId: application.adId },
      data: {
        reservedAmount: { increment: reservedAmount },
        available: { decrement: reservedAmount },
      },
    });
  }

  const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return prisma.videoSubmission.create({
    data: {
      applicationId: application.id,
      adId: application.adId,
      creatorId,
      videoUrl: opts.videoUrl ?? "https://www.tiktok.com/@test/video/1234567890",
      screenshotUrl: "/uploads/screenshots/test.png",
      claimedViews,
      reservedAmount,
      status: (opts.status ?? "submitted") as "submitted",
      slaDeadline,
    },
  });
}

/** Delete all escrow-related data for a given Ad (for test cleanup) */
export async function cleanupEscrowAd(adId: string) {
  // Order matters: deepest FK first
  await prisma.appeal.deleteMany({ where: { submission: { adId } } });
  await prisma.videoSubmission.deleteMany({ where: { adId } });
  await prisma.taskApplication.deleteMany({ where: { adId } });
  await prisma.escrowAccount.deleteMany({ where: { adId } });
  await prisma.ad.deleteMany({ where: { id: adId } });
}

/** Delete creator balance + transactions for a user */
export async function cleanupBalance(userId: string) {
  const bal = await prisma.creatorBalance.findUnique({ where: { userId } });
  if (!bal) return;
  await prisma.balanceTransaction.deleteMany({ where: { balanceId: bal.id } });
  await prisma.withdrawalRequest.deleteMany({ where: { balanceId: bal.id } });
  await prisma.creatorBalance.delete({ where: { id: bal.id } });
}

// ─── Cleanup promo codes by code pattern ────────────────────────────────────
export async function cleanupPromosByPattern(codePattern: string) {
  // First delete usages, then promo codes
  const promos = await prisma.promoCode.findMany({
    where: { code: { startsWith: codePattern } },
    select: { id: true },
  });
  const ids = promos.map((p) => p.id);
  if (ids.length > 0) {
    await prisma.promoCodeUsage.deleteMany({
      where: { promoCodeId: { in: ids } },
    });
    await prisma.promoCode.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
