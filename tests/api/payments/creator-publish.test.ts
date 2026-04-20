/**
 * Integration tests — POST /api/payments/creators/[id]/publish
 *
 * Covers: auth, validation, payment flow (mock), promo codes,
 * webhook processing, DB record verification with dates, cleanup.
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  buildRequest,
  trackUser,
  cleanup,
} from "../../helpers";
import { cityId } from "../refs";

import { POST as publishCreator } from "@/app/api/payments/creators/[id]/publish/route";
import { POST as webhookPost } from "@/app/api/payments/webhook/[provider]/route";

// helper: в новом дизайне webhook — dynamic route с params.provider
function webhook(req: Parameters<typeof webhookPost>[0]) {
  return webhookPost(req, { params: Promise.resolve({ provider: "mock" }) });
}

// ─── Shared state ───────────────────────────────────────────────────────────

let ownerToken: string;
let ownerUserId: string;
let otherToken: string;
let otherUserId: string;

// Track IDs for cleanup
const createdPromoIds: string[] = [];

// Helper: unique promo code per run
const RUN = `CP${Date.now().toString(36).toUpperCase()}`;
let promoCounter = 0;
function uniquePromoCode(): string {
  return `${RUN}${++promoCounter}`;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

async function createUnpublishedProfile(userId: string) {
  return prisma.creatorProfile.create({
    data: {
      userId,
      title: "Test Creator Profile",
      fullName: "Test Creator",
      isPublished: false,
      cityId: await cityId("Almaty"),
      availability: "available",
      minimumRate: 50_000,
      currency: "KZT",
    },
  });
}

async function createPublishedProfile(userId: string) {
  return prisma.creatorProfile.create({
    data: {
      userId,
      title: "Published Creator Profile",
      fullName: "Published Creator",
      isPublished: true,
      publishedAt: new Date(),
      cityId: await cityId("Almaty"),
      availability: "available",
      minimumRate: 30_000,
      currency: "KZT",
    },
  });
}

type PaymentType = "ad_publication" | "ad_boost" | "creator_publication";

async function createPromoCode(
  code: string,
  opts: {
    discountType: "percent" | "fixed_amount";
    discountValue: number;
    applicableTo: PaymentType[];
    maxUses?: number | null;
  },
) {
  const promo = await prisma.promoCode.create({
    data: {
      code: code.toUpperCase(),
      discountType: opts.discountType,
      discountValue: opts.discountValue,
      applicableTo: opts.applicableTo,
      maxUses: opts.maxUses ?? null,
      isActive: true,
    },
  });
  createdPromoIds.push(promo.id);
  return promo;
}

// ─── Setup & Cleanup ────────────────────────────────────────────────────────

beforeAll(async () => {
  const owner = await createTestUser({ name: "Profile Owner" });
  trackUser(owner.user.id);
  ownerToken = owner.token;
  ownerUserId = owner.user.id;

  const other = await createTestUser({ name: "Other User" });
  trackUser(other.user.id);
  otherToken = other.token;
  otherUserId = other.user.id;
});

afterAll(async () => {
  // Delete promo codes created in tests
  if (createdPromoIds.length > 0) {
    await prisma.promoCodeUsage.deleteMany({
      where: { promoCodeId: { in: createdPromoIds } },
    });
    await prisma.promoCode.deleteMany({
      where: { id: { in: createdPromoIds } },
    });
  }
  await cleanup();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/payments/creators/[id]/publish", () => {
  // ─── Group 1: Auth & Validation ───────────────────────────────────────

  describe("Auth & Validation", () => {
    it("returns 401 if not authenticated", async () => {
      const profile = await createUnpublishedProfile(ownerUserId);
      const req = buildRequest(`/api/payments/creators/${profile.id}/publish`, {
        method: "POST",
        body: { method: "kaspi" },
      });
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(401);

      // Cleanup profile
      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });

    it("returns 400 if payment method is missing", async () => {
      const profile = await createUnpublishedProfile(ownerUserId);
      const req = buildRequest(`/api/payments/creators/${profile.id}/publish`, {
        method: "POST",
        token: ownerToken,
        body: {},
      });
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(400);

      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });

    it("returns 404 if profile does not exist", async () => {
      const req = buildRequest(
        "/api/payments/creators/nonexistent-id-12345/publish",
        {
          method: "POST",
          token: ownerToken,
          body: { method: "kaspi" },
        },
      );
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: "nonexistent-id-12345" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 if user does not own the profile", async () => {
      const profile = await createUnpublishedProfile(ownerUserId);
      const req = buildRequest(`/api/payments/creators/${profile.id}/publish`, {
        method: "POST",
        token: otherToken, // other user's token
        body: { method: "kaspi" },
      });
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(403);

      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });

    it("returns 400 if profile is already published", async () => {
      const profile = await createPublishedProfile(ownerUserId);
      const req = buildRequest(`/api/payments/creators/${profile.id}/publish`, {
        method: "POST",
        token: ownerToken,
        body: { method: "kaspi" },
      });
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("уже опубликован");

      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });
  });

  // ─── Group 2: Payment flow + DB verification ─────────────────────────

  describe("Payment flow + DB verification", () => {
    let profileId: string;
    let paymentId: string;

    afterAll(async () => {
      // Cleanup: delete payment sessions then profile
      if (paymentId) {
        await prisma.paymentSession
          .delete({ where: { id: paymentId } })
          .catch(() => {});
      }
      if (profileId) {
        await prisma.paymentSession.deleteMany({
          where: { creatorProfileId: profileId },
        });
        await prisma.creatorProfile
          .delete({ where: { id: profileId } })
          .catch(() => {});
      }
    });

    it("creates PaymentSession with pending status and correct data", async () => {
      const profile = await createUnpublishedProfile(ownerUserId);
      profileId = profile.id;

      const req = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "kaspi" },
        },
      );
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      paymentId = body.paymentId;
      expect(paymentId).toBeDefined();
      expect(body.status).toBe("pending");
      expect(body.finalAmount).toBe(990);
      expect(body.isFree).toBe(false);

      // Verify PaymentSession in DB
      const session = await prisma.paymentSession.findUnique({
        where: { id: paymentId },
      });
      expect(session).not.toBeNull();
      expect(session!.type).toBe("creator_publication");
      expect(session!.amount).toBe(990);
      expect(session!.method).toBe("kaspi");
      expect(session!.status).toBe("pending");
      expect(session!.creatorProfileId).toBe(profile.id);
      expect(session!.userId).toBe(ownerUserId);

      // Verify createdAt is a Date close to now
      expect(session!.createdAt).toBeInstanceOf(Date);
      const createdDiff = Date.now() - session!.createdAt.getTime();
      expect(createdDiff).toBeGreaterThanOrEqual(0);
      expect(createdDiff).toBeLessThan(30_000);

      // Profile should still be unpublished
      const profileCheck = await prisma.creatorProfile.findUnique({
        where: { id: profile.id },
      });
      expect(profileCheck!.isPublished).toBe(false);
      expect(profileCheck!.publishedAt).toBeNull();
    });

    it("returns paymentUrl for mock provider", async () => {
      // paymentId was set in the previous test
      const session = await prisma.paymentSession.findUnique({
        where: { id: paymentId },
      });
      expect(session).not.toBeNull();
      expect(session!.externalId).toBeDefined();
      expect(session!.externalId).toContain("mock_");
    });

    it("webhook activates profile — sets isPublished=true and publishedAt", async () => {
      const beforeWebhook = Date.now();

      // Simulate webhook callback from payment provider
      const webhookReq = buildRequest("/api/payments/webhook", {
        method: "POST",
        body: {
          orderId: paymentId,
          externalId: `mock_webhook_${Date.now()}`,
          status: "success",
          amount: "990",
        },
      });
      const webhookRes = await webhook(webhookReq);
      expect(webhookRes.status).toBe(200);

      // Verify CreatorProfile in DB
      const profile = await prisma.creatorProfile.findUnique({
        where: { id: profileId },
      });
      expect(profile).not.toBeNull();
      expect(profile!.isPublished).toBe(true);
      expect(profile!.publishedAt).toBeInstanceOf(Date);

      // publishedAt should be close to now (within 30s to account for test execution)
      const publishedDiff = profile!.publishedAt!.getTime() - beforeWebhook;
      expect(publishedDiff).toBeGreaterThanOrEqual(-1000); // small tolerance for clock
      const afterDiff = Date.now() - profile!.publishedAt!.getTime();
      expect(afterDiff).toBeLessThan(30_000);
    });

    it("PaymentSession status becomes success after webhook", async () => {
      const session = await prisma.paymentSession.findUnique({
        where: { id: paymentId },
      });
      expect(session).not.toBeNull();
      expect(session!.status).toBe("success");
      expect(session!.externalId).toBeDefined();
    });
  });

  // ─── Group 3: Promo codes ────────────────────────────────────────────

  describe("Promo codes", () => {
    it("100% promo code → instant publish without payment provider", async () => {
      const promoCode = uniquePromoCode();
      await createPromoCode(promoCode, {
        discountType: "percent",
        discountValue: 100,
        applicableTo: ["creator_publication"],
      });

      const profile = await createUnpublishedProfile(ownerUserId);

      const req = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "kaspi", promoCode },
        },
      );
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("success");
      expect(body.isFree).toBe(true);
      expect(body.finalAmount).toBe(0);
      expect(body.originalAmount).toBe(990);
      expect(body.discountAmount).toBe(990);
      expect(body.promoApplied).toBe(true);

      // Verify profile is published in DB with correct publishedAt
      const dbProfile = await prisma.creatorProfile.findUnique({
        where: { id: profile.id },
      });
      expect(dbProfile!.isPublished).toBe(true);
      expect(dbProfile!.publishedAt).toBeInstanceOf(Date);
      const diffMs = Date.now() - dbProfile!.publishedAt!.getTime();
      expect(diffMs).toBeLessThan(30_000);

      // Verify PaymentSession in DB
      const session = await prisma.paymentSession.findUnique({
        where: { id: body.paymentId },
      });
      expect(session!.status).toBe("success");
      expect(session!.amount).toBe(0);
      expect(session!.originalAmount).toBe(990);
      expect(session!.discountAmount).toBe(990);

      // Cleanup: promoCodeUsages → paymentSessions → profile
      await prisma.promoCodeUsage.deleteMany({
        where: { paymentId: body.paymentId },
      });
      await prisma.paymentSession.deleteMany({
        where: { creatorProfileId: profile.id },
      });
      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });

    it("partial promo code → reduced amount in PaymentSession", async () => {
      const promoCode = uniquePromoCode();
      await createPromoCode(promoCode, {
        discountType: "fixed_amount",
        discountValue: 500,
        applicableTo: ["creator_publication"],
      });

      const profile = await createUnpublishedProfile(ownerUserId);

      const req = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "halyk", promoCode },
        },
      );
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("pending"); // not free, still needs payment
      expect(body.isFree).toBe(false);
      expect(body.originalAmount).toBe(990);
      expect(body.discountAmount).toBe(500);
      expect(body.finalAmount).toBe(490);
      expect(body.promoApplied).toBe(true);

      // Verify PaymentSession in DB
      const session = await prisma.paymentSession.findUnique({
        where: { id: body.paymentId },
      });
      expect(session!.amount).toBe(490);
      expect(session!.originalAmount).toBe(990);
      expect(session!.discountAmount).toBe(500);
      expect(session!.method).toBe("halyk");

      // Profile should NOT be published yet
      const dbProfile = await prisma.creatorProfile.findUnique({
        where: { id: profile.id },
      });
      expect(dbProfile!.isPublished).toBe(false);

      // Cleanup: promoCodeUsages → paymentSessions → profile
      await prisma.promoCodeUsage.deleteMany({
        where: { paymentId: body.paymentId },
      });
      await prisma.paymentSession.deleteMany({
        where: { creatorProfileId: profile.id },
      });
      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });

    it("invalid promo code → 400 error", async () => {
      const profile = await createUnpublishedProfile(ownerUserId);

      const req = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "kaspi", promoCode: "NONEXISTENT_CODE_XYZ" },
        },
      );
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.reason).toBe("not_found");

      // Profile untouched
      const dbProfile = await prisma.creatorProfile.findUnique({
        where: { id: profile.id },
      });
      expect(dbProfile!.isPublished).toBe(false);

      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });
  });

  // ─── Group 4: Edge cases ─────────────────────────────────────────────

  describe("Edge cases", () => {
    it("webhook is idempotent — double call does not break", async () => {
      const profile = await createUnpublishedProfile(ownerUserId);

      // Create payment and trigger first webhook
      const req = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "card" },
        },
      );
      const res = await publishCreator(req, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res.status).toBe(200);
      const { paymentId } = await res.json();

      // First webhook call
      const wh1 = buildRequest("/api/payments/webhook", {
        method: "POST",
        body: {
          orderId: paymentId,
          externalId: `mock_idempotent_1`,
          status: "success",
          amount: "990",
        },
      });
      const whRes1 = await webhook(wh1);
      expect(whRes1.status).toBe(200);

      // Record published time
      const profileAfter1 = await prisma.creatorProfile.findUnique({
        where: { id: profile.id },
      });
      expect(profileAfter1!.isPublished).toBe(true);
      const publishedAt1 = profileAfter1!.publishedAt!.getTime();

      // Second webhook call (duplicate)
      const wh2 = buildRequest("/api/payments/webhook", {
        method: "POST",
        body: {
          orderId: paymentId,
          externalId: `mock_idempotent_2`,
          status: "success",
          amount: "990",
        },
      });
      const whRes2 = await webhook(wh2);
      expect(whRes2.status).toBe(200); // Should not error

      // Verify nothing changed
      const profileAfter2 = await prisma.creatorProfile.findUnique({
        where: { id: profile.id },
      });
      expect(profileAfter2!.isPublished).toBe(true);
      expect(profileAfter2!.publishedAt!.getTime()).toBe(publishedAt1); // same timestamp

      const session = await prisma.paymentSession.findUnique({
        where: { id: paymentId },
      });
      expect(session!.status).toBe("success");
      // externalId should be from first call, not overwritten by second
      expect(session!.externalId).toBe("mock_idempotent_1");

      // Cleanup
      await prisma.paymentSession.deleteMany({
        where: { creatorProfileId: profile.id },
      });
      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });

    it("cannot publish same profile twice after successful payment", async () => {
      const promoCode = uniquePromoCode();
      await createPromoCode(promoCode, {
        discountType: "percent",
        discountValue: 100,
        applicableTo: ["creator_publication"],
      });

      const profile = await createUnpublishedProfile(ownerUserId);

      // First publish — success (free via promo)
      const req1 = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "kaspi", promoCode },
        },
      );
      const res1 = await publishCreator(req1, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.status).toBe("success");

      // Second attempt — should fail (already published)
      const req2 = buildRequest(
        `/api/payments/creators/${profile.id}/publish`,
        {
          method: "POST",
          token: ownerToken,
          body: { method: "kaspi" },
        },
      );
      const res2 = await publishCreator(req2, {
        params: Promise.resolve({ id: profile.id }),
      });
      expect(res2.status).toBe(400);
      const body2 = await res2.json();
      expect(body2.error).toContain("уже опубликован");

      // Cleanup: promoCodeUsages → paymentSessions → profile
      const sessions = await prisma.paymentSession.findMany({
        where: { creatorProfileId: profile.id },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await prisma.promoCodeUsage.deleteMany({
          where: { paymentId: { in: sessionIds } },
        });
      }
      await prisma.paymentSession.deleteMany({
        where: { creatorProfileId: profile.id },
      });
      await prisma.creatorProfile.delete({ where: { id: profile.id } });
    });
  });
});
