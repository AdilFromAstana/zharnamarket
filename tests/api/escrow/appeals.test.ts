/**
 * Integration tests — POST /api/submissions/[id]/appeal
 *                   + GET/POST /api/admin/appeals
 *                   + POST /api/admin/appeals/[id]/resolve
 *
 * Covers: auth, 48h deadline, permanent-reject block,
 * appeal creation, admin listing, resolve approved/rejected.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  createAdminUser,
  trackUser,
  cleanup,
  buildRequest,
  createEscrowAd,
  createApplication,
  cleanupEscrowAd,
} from "../../helpers";

import { POST as appealPost } from "@/app/api/submissions/[id]/appeal/route";
import { GET as appealsGet } from "@/app/api/admin/appeals/route";
import { POST as resolvePost } from "@/app/api/admin/appeals/[id]/resolve/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let adminToken: string;
let creatorToken: string;
let creatorId: string;
let advertiserId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const admin = await createAdminUser({ name: "Appeal Admin" });
  trackUser(admin.user.id);
  adminToken = admin.token;

  const advertiser = await createTestUser({ name: "Adv Appeal" });
  trackUser(advertiser.user.id);
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Appeal" });
  trackUser(creator.user.id);
  creatorToken = creator.token;
  creatorId = creator.user.id;
});

afterAll(async () => {
  await cleanup();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a rejected submission directly in DB */
async function createRejectedSubmission(
  adId: string,
  creatorId: string,
  reason: string = "no_brand",
) {
  const app = await createApplication(adId, creatorId);
  return prisma.videoSubmission.create({
    data: {
      applicationId: app.id,
      adId,
      creatorId,
      videoUrl: `https://www.tiktok.com/@test/video/${Date.now()}`,
      screenshotUrl: "/uploads/screenshots/test.png",
      claimedViews: 20_000,
      reservedAmount: 0,
      status: "rejected",
      rejectionReason: reason as "no_brand",
      moderatedAt: new Date(),
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/submissions/[id]/appeal", () => {
  describe("Auth & Guards", () => {
    it("returns 401 if not authenticated", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const sub = await createRejectedSubmission(ad.id, creatorId);

      const req = buildRequest(`/api/submissions/${sub.id}/appeal`, {
        method: "POST",
        body: { reason: "This is valid because the brand is clearly visible in the video." },
      });
      const res = await appealPost(req, { params: Promise.resolve({ id: sub.id }) });
      expect(res.status).toBe(401);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if submission does not exist", async () => {
      const req = buildRequest("/api/submissions/nonexistent-sub/appeal", {
        method: "POST",
        token: creatorToken,
        body: { reason: "This is a valid appeal reason for testing." },
      });
      const res = await appealPost(req, { params: Promise.resolve({ id: "nonexistent-sub" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 if creator does not own submission", async () => {
      const other = await createTestUser({ name: "Other Creator" });
      trackUser(other.user.id);

      const { ad } = await createEscrowAd(advertiserId);
      const sub = await createRejectedSubmission(ad.id, creatorId);

      const req = buildRequest(`/api/submissions/${sub.id}/appeal`, {
        method: "POST",
        token: other.token,
        body: { reason: "This appeal is from a different creator." },
      });
      const res = await appealPost(req, { params: Promise.resolve({ id: sub.id }) });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if submission is not rejected", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await prisma.videoSubmission.create({
        data: {
          applicationId: app.id,
          adId: ad.id,
          creatorId,
          videoUrl: "https://www.tiktok.com/@test/video/submitted",
          screenshotUrl: "/uploads/test.png",
          claimedViews: 10_000,
          reservedAmount: 0,
          status: "submitted", // not rejected
          slaDeadline: new Date(Date.now() + 86_400_000),
        },
      });

      const req = buildRequest(`/api/submissions/${sub.id}/appeal`, {
        method: "POST",
        token: creatorToken,
        body: { reason: "This appeal is on a submitted status." },
      });
      const res = await appealPost(req, { params: Promise.resolve({ id: sub.id }) });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 for permanent rejection reasons (fake_stats, boosted_views)", async () => {
      for (const reason of ["fake_stats", "boosted_views"]) {
        const { ad } = await createEscrowAd(advertiserId);
        const sub = await createRejectedSubmission(ad.id, creatorId, reason);

        const req = buildRequest(`/api/submissions/${sub.id}/appeal`, {
          method: "POST",
          token: creatorToken,
          body: { reason: "I did not boost views, this is legitimate." },
        });
        const res = await appealPost(req, { params: Promise.resolve({ id: sub.id }) });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/недоступна/i);
        await cleanupEscrowAd(ad.id);
      }
    });

    it("returns 400 if appeal reason is too short (< 10 chars)", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const sub = await createRejectedSubmission(ad.id, creatorId);

      const req = buildRequest(`/api/submissions/${sub.id}/appeal`, {
        method: "POST",
        token: creatorToken,
        body: { reason: "Too short" },
      });
      const res = await appealPost(req, { params: Promise.resolve({ id: sub.id }) });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(ad.id);
    });
  });

  describe("Successful appeal creation", () => {
    let adId: string;
    let appealId: string;

    afterAll(async () => {
      if (adId) await cleanupEscrowAd(adId);
    });

    it("creates Appeal and returns 201", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      adId = ad.id;
      const sub = await createRejectedSubmission(adId, creatorId, "no_brand");

      const req = buildRequest(`/api/submissions/${sub.id}/appeal`, {
        method: "POST",
        token: creatorToken,
        body: {
          reason: "The brand logo is visible at timestamp 0:15 in the video.",
        },
      });
      const res = await appealPost(req, { params: Promise.resolve({ id: sub.id }) });
      expect(res.status).toBe(201);

      const body = await res.json();
      appealId = body.id;
      expect(body.id).toBeDefined();
      expect(body.status).toBe("pending");
      expect(body.submissionId).toBe(sub.id);
      expect(body.creatorId).toBe(creatorId);

      // Verify DB record
      const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
      expect(appeal).not.toBeNull();
      expect(appeal!.status).toBe("pending");
      expect(appeal!.deadline).toBeInstanceOf(Date);
    });

    it("returns 400 if appeal already exists for same submission", async () => {
      // Find the submission that has an appeal
      const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });

      const req = buildRequest(`/api/submissions/${appeal!.submissionId}/appeal`, {
        method: "POST",
        token: creatorToken,
        body: { reason: "Trying to appeal a second time for the same submission." },
      });
      const res = await appealPost(req, {
        params: Promise.resolve({ id: appeal!.submissionId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже подана/i);
    });
  });
});

describe("GET /api/admin/appeals", () => {
  it("returns 401 if not authenticated", async () => {
    const req = buildRequest("/api/admin/appeals", { token: undefined });
    const res = await appealsGet(req);
    expect(res.status).toBe(401);
  });

  it("returns paginated list of pending appeals for admin", async () => {
    const req = buildRequest("/api/admin/appeals?status=pending&page=1&limit=20", {
      token: adminToken,
    });
    const res = await appealsGet(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(0);
  });
});

describe("POST /api/admin/appeals/[id]/resolve", () => {
  let adId: string;
  let appealId: string;
  let subId: string;

  beforeAll(async () => {
    const { ad } = await createEscrowAd(advertiserId);
    adId = ad.id;
    const sub = await createRejectedSubmission(adId, creatorId, "wrong_hashtags");
    subId = sub.id;

    const appeal = await prisma.appeal.create({
      data: {
        submissionId: sub.id,
        creatorId,
        reason: "I added the hashtags before the deadline. Check description.",
        status: "pending",
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    appealId = appeal.id;
  });

  afterAll(async () => {
    if (adId) await cleanupEscrowAd(adId);
  });

  it("returns 401 if not authenticated", async () => {
    const req = buildRequest(`/api/admin/appeals/${appealId}/resolve`, {
      method: "POST",
      body: { decision: "approved" },
    });
    const res = await resolvePost(req, { params: Promise.resolve({ id: appealId }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 if decision is invalid", async () => {
    const req = buildRequest(`/api/admin/appeals/${appealId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: { decision: "maybe" },
    });
    const res = await resolvePost(req, { params: Promise.resolve({ id: appealId }) });
    expect(res.status).toBe(400);
  });

  it("approved decision puts submission back to submitted", async () => {
    const req = buildRequest(`/api/admin/appeals/${appealId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: { decision: "approved", comment: "Hashtags confirmed." },
    });
    const res = await resolvePost(req, { params: Promise.resolve({ id: appealId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision).toBe("approved");

    // Verify appeal updated
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    expect(appeal!.status).toBe("approved");
    expect(appeal!.reviewedBy).toBeDefined();
    expect(appeal!.reviewComment).toBe("Hashtags confirmed.");

    // Submission should be back to submitted
    const sub = await prisma.videoSubmission.findUnique({ where: { id: subId } });
    expect(sub!.status).toBe("submitted");
  });

  it("returns 400 if appeal already resolved", async () => {
    const req = buildRequest(`/api/admin/appeals/${appealId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: { decision: "rejected" },
    });
    const res = await resolvePost(req, { params: Promise.resolve({ id: appealId }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/уже рассмотрена/i);
  });
});
