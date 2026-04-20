/**
 * Integration tests — POST /api/tasks/[id]/submissions
 *
 * Covers: auth, auto-checks (deadline, budget, min views, duplicate),
 * escrow reservation, budget partial reservation, claimedViews capping.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  trackUser,
  cleanup,
  buildRequest,
  createEscrowAd,
  createApplication,
  cleanupEscrowAd,
  cleanupBalance,
} from "../../helpers";
import { cityId, categoryId } from "../refs";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";

import { POST as submitPost } from "@/app/api/tasks/[id]/submissions/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let advertiserId: string;
let creatorToken: string;
let creatorId: string;

let adId: string;
let appId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const advertiser = await createTestUser({ name: "Adv Subs" });
  trackUser(advertiser.user.id);
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Subs" });
  trackUser(creator.user.id);
  creatorToken = creator.token;
  creatorId = creator.user.id;

  const { ad } = await createEscrowAd(advertiserId, {
    rpm: 200,
    totalBudget: 10_000,
    minViews: 5_000,
    maxViewsPerCreator: 50_000,
  });
  adId = ad.id;

  const app = await createApplication(adId, creatorId);
  appId = app.id;
});

afterAll(async () => {
  await cleanupBalance(creatorId);
  await cleanupEscrowAd(adId);
  await cleanup();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function submitReq(token: string | undefined, body: unknown) {
  return buildRequest(`/api/tasks/${adId}/submissions`, {
    method: "POST",
    token,
    body,
  });
}

const VALID_BODY = {
  videoUrl: "https://www.tiktok.com/@test/video/9999999999",
  screenshotUrl: "/uploads/screenshots/test.png",
  claimedViews: 20_000,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/tasks/[id]/submissions", () => {
  describe("Auth & Validation", () => {
    it("returns 401 if not authenticated", async () => {
      const res = await submitPost(submitReq(undefined, VALID_BODY), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 400 if videoUrl is missing", async () => {
      const res = await submitPost(
        submitReq(creatorToken, { ...VALID_BODY, videoUrl: "" }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 if videoUrl is not a valid URL", async () => {
      const res = await submitPost(
        submitReq(creatorToken, { ...VALID_BODY, videoUrl: "not-a-url" }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 if screenshotUrl is missing", async () => {
      const res = await submitPost(
        submitReq(creatorToken, { ...VALID_BODY, screenshotUrl: "" }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 if claimedViews is missing", async () => {
      const res = await submitPost(
        submitReq(creatorToken, { ...VALID_BODY, claimedViews: 0 }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Auto-checks", () => {
    it("returns 400 if claimedViews below minViews threshold", async () => {
      const res = await submitPost(
        submitReq(creatorToken, { ...VALID_BODY, claimedViews: 1_000 }), // minViews=5000
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/минимум/i);
    });

    it("returns 400 if creator has not applied first", async () => {
      const stranger = await createTestUser({ name: "Stranger Subs" });
      trackUser(stranger.user.id);
      const res = await submitPost(
        buildRequest(`/api/tasks/${adId}/submissions`, {
          method: "POST",
          token: stranger.token,
          body: VALID_BODY,
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/откликнитесь/i);
    });

    it("returns 400 if task deadline has passed", async () => {
      const pastDeadlineAd = await prisma.ad.create({
        data: {
          ownerId: advertiserId,
          title: "Past Deadline Ad",
          description: "Deadline passed",
          platform: "TikTok",
          cityId: await cityId("Almaty"),
          categoryId: await categoryId("Memy"),
          status: "active",
          budgetType: "per_views",
          paymentMode: "escrow",
          rpm: 100,
          minViews: 1_000,
          totalBudget: 10_000,
          submissionDeadline: new Date(Date.now() - 1000),
        },
      });
      await prisma.escrowAccount.create({
        data: { adId: pastDeadlineAd.id, initialAmount: 10_000, available: 10_000, spentAmount: 0, reservedAmount: 0, status: "active" },
      });
      const pastApp = await createApplication(pastDeadlineAd.id, creatorId);

      const res = await submitPost(
        buildRequest(`/api/tasks/${pastDeadlineAd.id}/submissions`, {
          method: "POST",
          token: creatorToken,
          body: VALID_BODY,
        }),
        { params: Promise.resolve({ id: pastDeadlineAd.id }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/дедлайн/i);

      await prisma.taskApplication.delete({ where: { id: pastApp.id } });
      await cleanupEscrowAd(pastDeadlineAd.id);
    });

    it("returns 400 if escrow budget is 0", async () => {
      const emptyBudgetAd = await prisma.ad.create({
        data: {
          ownerId: advertiserId,
          title: "Empty Budget Ad",
          description: "Zero budget",
          platform: "TikTok",
          cityId: await cityId("Almaty"),
          categoryId: await categoryId("Memy"),
          status: "active",
          budgetType: "per_views",
          paymentMode: "escrow",
          rpm: 100,
          minViews: 1_000,
          totalBudget: 10_000,
          submissionDeadline: new Date(Date.now() + 86_400_000),
        },
      });
      await prisma.escrowAccount.create({
        data: { adId: emptyBudgetAd.id, initialAmount: 10_000, available: 0, spentAmount: 10_000, reservedAmount: 0, status: "exhausted" },
      });
      const emptyApp = await createApplication(emptyBudgetAd.id, creatorId);

      const res = await submitPost(
        buildRequest(`/api/tasks/${emptyBudgetAd.id}/submissions`, {
          method: "POST",
          token: creatorToken,
          body: VALID_BODY,
        }),
        { params: Promise.resolve({ id: emptyBudgetAd.id }) },
      );
      expect(res.status).toBe(400);
      // Error can be "Эскроу-счёт недоступен" (status=exhausted) or "Бюджет задания исчерпан" (available=0)
      const body = await res.json();
      expect(body.error).toBeDefined();

      await prisma.taskApplication.delete({ where: { id: emptyApp.id } });
      await cleanupEscrowAd(emptyBudgetAd.id);
    });
  });

  describe("contentStatus guard (content_approved required)", () => {
    it("returns 400 if application has contentStatus pending_video", async () => {
      // Create a fresh creator with a pending_video application
      const pendingCreator = await createTestUser({ name: "PendingVideo Subs" });
      trackUser(pendingCreator.user.id);
      await createApplication(adId, pendingCreator.user.id, "pending_video");

      const res = await submitPost(
        buildRequest(`/api/tasks/${adId}/submissions`, {
          method: "POST",
          token: pendingCreator.token,
          body: { ...VALID_BODY, videoUrl: "https://tiktok.com/@test/video/pending_vid" },
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/прикрепите ссылку/i);
    });

    it("returns 400 if application has contentStatus pending_review", async () => {
      const reviewCreator = await createTestUser({ name: "PendingReview Subs" });
      trackUser(reviewCreator.user.id);
      await createApplication(adId, reviewCreator.user.id, "pending_review", {
        videoUrl: "https://tiktok.com/@test/video/review_vid",
        contentReviewDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });

      const res = await submitPost(
        buildRequest(`/api/tasks/${adId}/submissions`, {
          method: "POST",
          token: reviewCreator.token,
          body: { ...VALID_BODY, videoUrl: "https://tiktok.com/@test/video/review_vid_sub" },
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/ожидайте одобрения/i);
    });

    it("returns 400 if application has contentStatus content_rejected", async () => {
      const rejectedCreator = await createTestUser({ name: "Rejected Subs" });
      trackUser(rejectedCreator.user.id);
      await createApplication(adId, rejectedCreator.user.id, "content_rejected", {
        videoUrl: "https://tiktok.com/@test/video/rejected_vid",
        contentRejectionNote: "Не соответствует ТЗ",
      });

      const res = await submitPost(
        buildRequest(`/api/tasks/${adId}/submissions`, {
          method: "POST",
          token: rejectedCreator.token,
          body: { ...VALID_BODY, videoUrl: "https://tiktok.com/@test/video/rejected_vid_sub" },
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/заказчик отклонил/i);
    });
  });

  describe("Successful submission + escrow reservation", () => {
    let submissionId: string;

    it("creates submission and reserves correct amount from escrow", async () => {
      const escrowBefore = await prisma.escrowAccount.findUnique({ where: { adId } });

      const res = await submitPost(submitReq(creatorToken, VALID_BODY), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      submissionId = body.submission.id;
      expect(submissionId).toBeDefined();
      expect(body.submission.status).toBe("submitted");

      // claimedViews=20_000, rpm=200, cap=50_000 → expected gross = (20000/1000)*200 = 4000
      const expectedCommission = 4_000 * PLATFORM_COMMISSION_RATE;
      const expectedPayout = 4_000 - expectedCommission;
      expect(body.preview.grossAmount).toBe(4_000);
      expect(body.preview.commissionAmount).toBeCloseTo(expectedCommission, 0);
      expect(body.preview.payoutAmount).toBeCloseTo(expectedPayout, 0);

      // Verify DB submission
      const sub = await prisma.videoSubmission.findUnique({ where: { id: submissionId } });
      expect(sub).not.toBeNull();
      expect(sub!.claimedViews).toBe(20_000);
      expect(sub!.reservedAmount).toBe(4_000);
      expect(sub!.status).toBe("submitted");
      expect(sub!.videoUrl).toBe(VALID_BODY.videoUrl);

      // Verify escrow reservation
      const escrowAfter = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrowAfter!.reservedAmount).toBe(escrowBefore!.reservedAmount + 4_000);
      expect(escrowAfter!.available).toBe(escrowBefore!.available - 4_000);
    });

    it("returns 400 if same video URL is submitted again", async () => {
      // Different application from another creator
      const creator2 = await createTestUser({ name: "Creator2 Subs" });
      trackUser(creator2.user.id);
      await createApplication(adId, creator2.user.id);

      const res = await submitPost(
        buildRequest(`/api/tasks/${adId}/submissions`, {
          method: "POST",
          token: creator2.token,
          body: VALID_BODY, // same videoUrl
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже было подано/i);
    });

    it("returns 400 if same creator tries to submit again", async () => {
      const res = await submitPost(
        submitReq(creatorToken, {
          ...VALID_BODY,
          videoUrl: "https://www.tiktok.com/@test/video/different",
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже подавали/i);
    });

    it("caps claimedViews at maxViewsPerCreator for reservation", async () => {
      const creator3 = await createTestUser({ name: "Creator3 HiViews" });
      trackUser(creator3.user.id);
      await createApplication(adId, creator3.user.id);

      const escrowBefore = await prisma.escrowAccount.findUnique({ where: { adId } });

      const res = await submitPost(
        buildRequest(`/api/tasks/${adId}/submissions`, {
          method: "POST",
          token: creator3.token,
          body: {
            videoUrl: "https://www.tiktok.com/@test/video/higherviews",
            screenshotUrl: "/uploads/screenshots/test2.png",
            claimedViews: 100_000, // exceeds maxViewsPerCreator=50_000
          },
        }),
        { params: Promise.resolve({ id: adId }) },
      );
      expect(res.status).toBe(201);

      const body = await res.json();
      // effectiveViews = 50_000 (capped from 100_000), rpm=200, gross = (50_000/1000)*200 = 10_000
      expect(body.preview.effectiveViews).toBe(50_000);
      expect(body.preview.grossAmount).toBe(10_000);

      const sub = await prisma.videoSubmission.findUnique({
        where: { id: body.submission.id },
      });
      // reservedAmount = min(grossAmount=10_000, available) — available may be < 10_000
      // after creator1's 4_000 reservation, available=6_000, so reservedAmount=6_000
      expect(sub!.reservedAmount).toBeGreaterThan(0);
      expect(sub!.reservedAmount).toBeLessThanOrEqual(10_000);

      // Escrow available reduced by the reserved amount
      const escrowAfter = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrowAfter!.available).toBe(escrowBefore!.available - sub!.reservedAmount!);
    });
  });
});
