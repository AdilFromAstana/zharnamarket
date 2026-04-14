/**
 * Integration tests — POST/GET/DELETE /api/tasks/[id]/apply
 *
 * Covers: auth, escrow-only guard, deadline check, budget check,
 * duplicate prevention, own-task guard, application creation/deletion,
 * new contentStatus/videoDeadline fields, reapply logic, lazy-check of deadlines.
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
} from "../../helpers";

import {
  POST as applyPost,
  GET as applyGet,
  DELETE as applyDelete,
} from "@/app/api/tasks/[id]/apply/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let advertiserToken: string;
let advertiserId: string;
let creatorToken: string;
let creatorId: string;
let creator2Token: string;
let creator2Id: string;

let adId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const advertiser = await createTestUser({ name: "Advertiser Apply" });
  trackUser(advertiser.user.id);
  advertiserToken = advertiser.token;
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Apply A" });
  trackUser(creator.user.id);
  creatorToken = creator.token;
  creatorId = creator.user.id;

  const creator2 = await createTestUser({ name: "Creator Apply B" });
  trackUser(creator2.user.id);
  creator2Token = creator2.token;
  creator2Id = creator2.user.id;

  const { ad } = await createEscrowAd(advertiserId);
  adId = ad.id;
});

afterAll(async () => {
  await cleanupEscrowAd(adId);
  await cleanup();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyReq(token?: string) {
  return buildRequest(`/api/tasks/${adId}/apply`, { method: "POST", token });
}

function getReq(token?: string) {
  return buildRequest(`/api/tasks/${adId}/apply`, { method: "GET", token });
}

function deleteReq(token?: string) {
  return buildRequest(`/api/tasks/${adId}/apply`, { method: "DELETE", token });
}

// ─── POST tests ──────────────────────────────────────────────────────────────

describe("POST /api/tasks/[id]/apply", () => {
  describe("Auth & Guards", () => {
    it("returns 401 if not authenticated", async () => {
      const res = await applyPost(applyReq(), { params: Promise.resolve({ id: adId }) });
      expect(res.status).toBe(401);
    });

    it("returns 400 if task does not exist", async () => {
      const req = buildRequest("/api/tasks/nonexistent-id/apply", {
        method: "POST",
        token: creatorToken,
      });
      const res = await applyPost(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 if owner tries to take their own task", async () => {
      const res = await applyPost(applyReq(advertiserToken), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/своё задание/i);
    });

    it("returns 400 if task paymentMode is direct (not escrow)", async () => {
      const directAd = await prisma.ad.create({
        data: {
          ownerId: advertiserId,
          title: "Direct Ad",
          description: "Direct contact ad",
          platform: "TikTok",
          city: "Almaty",
          category: "Memy",
          status: "active",
          budgetType: "per_views",
          paymentMode: "direct",
        },
      });
      const req = buildRequest(`/api/tasks/${directAd.id}/apply`, {
        method: "POST",
        token: creatorToken,
      });
      const res = await applyPost(req, { params: Promise.resolve({ id: directAd.id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/поддерживает/i);
      await prisma.ad.delete({ where: { id: directAd.id } });
    });

    it("returns 400 if task is not active", async () => {
      const pausedAd = await prisma.ad.create({
        data: {
          ownerId: advertiserId,
          title: "Paused Escrow Ad",
          description: "Paused task",
          platform: "TikTok",
          city: "Almaty",
          category: "Memy",
          status: "paused",
          budgetType: "per_views",
          paymentMode: "escrow",
          rpm: 100,
          totalBudget: 10_000,
          submissionDeadline: new Date(Date.now() + 86_400_000),
        },
      });
      await prisma.escrowAccount.create({
        data: {
          adId: pausedAd.id,
          initialAmount: 10_000,
          available: 10_000,
          spentAmount: 0,
          reservedAmount: 0,
          status: "active",
        },
      });
      const req = buildRequest(`/api/tasks/${pausedAd.id}/apply`, {
        method: "POST",
        token: creatorToken,
      });
      const res = await applyPost(req, { params: Promise.resolve({ id: pausedAd.id }) });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(pausedAd.id);
    });

    it("returns 400 if submission deadline has passed", async () => {
      const expiredAd = await prisma.ad.create({
        data: {
          ownerId: advertiserId,
          title: "Expired Deadline Ad",
          description: "Deadline passed",
          platform: "TikTok",
          city: "Almaty",
          category: "Memy",
          status: "active",
          budgetType: "per_views",
          paymentMode: "escrow",
          rpm: 100,
          totalBudget: 10_000,
          submissionDeadline: new Date(Date.now() - 1000),
        },
      });
      await prisma.escrowAccount.create({
        data: {
          adId: expiredAd.id,
          initialAmount: 10_000,
          available: 10_000,
          spentAmount: 0,
          reservedAmount: 0,
          status: "active",
        },
      });
      const req = buildRequest(`/api/tasks/${expiredAd.id}/apply`, {
        method: "POST",
        token: creatorToken,
      });
      const res = await applyPost(req, { params: Promise.resolve({ id: expiredAd.id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/дедлайн/i);
      await cleanupEscrowAd(expiredAd.id);
    });

    it("returns 400 if escrow budget is exhausted", async () => {
      const exhaustedAd = await prisma.ad.create({
        data: {
          ownerId: advertiserId,
          title: "Exhausted Budget Ad",
          description: "No budget left",
          platform: "TikTok",
          city: "Almaty",
          category: "Memy",
          status: "active",
          budgetType: "per_views",
          paymentMode: "escrow",
          rpm: 100,
          totalBudget: 10_000,
          submissionDeadline: new Date(Date.now() + 86_400_000),
        },
      });
      await prisma.escrowAccount.create({
        data: {
          adId: exhaustedAd.id,
          initialAmount: 10_000,
          available: 0,
          spentAmount: 10_000,
          reservedAmount: 0,
          status: "exhausted",
        },
      });
      const req = buildRequest(`/api/tasks/${exhaustedAd.id}/apply`, {
        method: "POST",
        token: creatorToken,
      });
      const res = await applyPost(req, { params: Promise.resolve({ id: exhaustedAd.id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/бюджет/i);
      await cleanupEscrowAd(exhaustedAd.id);
    });
  });

  describe("Successful application", () => {
    it("creates TaskApplication with pending_video status and videoDeadline", async () => {
      const before = Date.now();
      const res = await applyPost(applyReq(creatorToken), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.adId).toBe(adId);
      expect(body.creatorId).toBe(creatorId);
      expect(body.contentStatus).toBe("pending_video");

      // videoDeadline should be ~48h from now (within a 5s window)
      const expectedDeadline = before + 48 * 60 * 60 * 1000;
      const actualDeadline = new Date(body.videoDeadline).getTime();
      expect(actualDeadline).toBeGreaterThan(expectedDeadline - 5_000);
      expect(actualDeadline).toBeLessThan(expectedDeadline + 5_000);

      // Verify DB record
      const app = await prisma.taskApplication.findUnique({
        where: { adId_creatorId: { adId, creatorId } },
      });
      expect(app).not.toBeNull();
      expect(app!.contentStatus).toBe("pending_video");
      expect(app!.videoDeadline).not.toBeNull();
    });

    it("returns 400 if creator already applied (status is pending_video, not rejected)", async () => {
      const res = await applyPost(applyReq(creatorToken), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже откликнулись/i);
    });

    it("second creator can also apply to same task", async () => {
      const res = await applyPost(applyReq(creator2Token), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.creatorId).toBe(creator2Id);
      expect(body.contentStatus).toBe("pending_video");
    });
  });

  describe("Reapply logic", () => {
    it("returns 400 if existing application has pending_review status", async () => {
      // Update creator's application to pending_review
      await prisma.taskApplication.update({
        where: { adId_creatorId: { adId, creatorId } },
        data: {
          contentStatus: "pending_review",
          videoUrl: "https://tiktok.com/@test/video/99",
          videoSubmittedAt: new Date(),
          contentReviewDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      });

      const res = await applyPost(applyReq(creatorToken), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/уже откликнулись/i);
    });

    it("returns 200 and resets fields when reapplying after content_rejected", async () => {
      // Set application to content_rejected
      await prisma.taskApplication.update({
        where: { adId_creatorId: { adId, creatorId } },
        data: {
          contentStatus: "content_rejected",
          contentReviewedAt: new Date(),
          contentRejectionNote: "Видео не соответствует ТЗ",
        },
      });

      const before = Date.now();
      const res = await applyPost(applyReq(creatorToken), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.contentStatus).toBe("pending_video");
      expect(body.videoUrl).toBeNull();
      expect(body.contentRejectionNote).toBeNull();
      expect(body.contentReviewedAt).toBeNull();

      // New videoDeadline should be ~48h from now
      const actualDeadline = new Date(body.videoDeadline).getTime();
      expect(actualDeadline).toBeGreaterThan(before + 47 * 60 * 60 * 1000);

      // Verify DB reset
      const app = await prisma.taskApplication.findUnique({
        where: { adId_creatorId: { adId, creatorId } },
      });
      expect(app!.contentStatus).toBe("pending_video");
      expect(app!.videoUrl).toBeNull();
      expect(app!.contentRejectionNote).toBeNull();
    });

    it("returns 400 if reapply attempted when status is content_approved", async () => {
      await prisma.taskApplication.update({
        where: { adId_creatorId: { adId, creatorId } },
        data: { contentStatus: "content_approved" },
      });

      const res = await applyPost(applyReq(creatorToken), {
        params: Promise.resolve({ id: adId }),
      });
      expect(res.status).toBe(400);

      // Reset for other tests
      await prisma.taskApplication.update({
        where: { adId_creatorId: { adId, creatorId } },
        data: { contentStatus: "pending_video" },
      });
    });
  });
});

// ─── GET tests ───────────────────────────────────────────────────────────────

describe("GET /api/tasks/[id]/apply", () => {
  it("returns { application: null } when user is not logged in", async () => {
    const res = await applyGet(getReq(), { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.application).toBeNull();
  });

  it("returns { application: null } when creator has not applied", async () => {
    const stranger = await createTestUser({ name: "Stranger Get" });
    trackUser(stranger.user.id);
    const req = buildRequest(`/api/tasks/${adId}/apply`, {
      method: "GET",
      token: stranger.token,
    });
    const res = await applyGet(req, { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.application).toBeNull();
  });

  it("returns the application with correct fields when creator has applied", async () => {
    const req = buildRequest(`/api/tasks/${adId}/apply`, {
      method: "GET",
      token: creatorToken,
    });
    const res = await applyGet(req, { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.application).not.toBeNull();
    expect(body.application.adId).toBe(adId);
    expect(body.application.creatorId).toBe(creatorId);
    expect(body.application.contentStatus).toBeDefined();
    expect(body.application.videoDeadline).toBeDefined();
  });

  it("lazy-check: updates pending_video to video_timed_out if videoDeadline has expired", async () => {
    // Force the deadline to be in the past
    await prisma.taskApplication.update({
      where: { adId_creatorId: { adId, creatorId } },
      data: {
        contentStatus: "pending_video",
        videoDeadline: new Date(Date.now() - 1000), // 1 second in the past
      },
    });

    const req = buildRequest(`/api/tasks/${adId}/apply`, {
      method: "GET",
      token: creatorToken,
    });
    const res = await applyGet(req, { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.application.contentStatus).toBe("video_timed_out");

    // Verify DB was updated
    const app = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId } },
    });
    expect(app!.contentStatus).toBe("video_timed_out");

    // Reset for subsequent tests
    await prisma.taskApplication.update({
      where: { adId_creatorId: { adId, creatorId } },
      data: {
        contentStatus: "pending_video",
        videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
  });

  it("lazy-check: updates pending_review to content_approved if contentReviewDeadline has expired", async () => {
    await prisma.taskApplication.update({
      where: { adId_creatorId: { adId, creatorId } },
      data: {
        contentStatus: "pending_review",
        videoUrl: "https://tiktok.com/@test/video/autocheck",
        videoSubmittedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
        contentReviewDeadline: new Date(Date.now() - 1000), // expired
      },
    });

    const req = buildRequest(`/api/tasks/${adId}/apply`, {
      method: "GET",
      token: creatorToken,
    });
    const res = await applyGet(req, { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.application.contentStatus).toBe("content_approved");

    // Verify DB was updated
    const app = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId } },
    });
    expect(app!.contentStatus).toBe("content_approved");

    // Reset for subsequent tests
    await prisma.taskApplication.update({
      where: { adId_creatorId: { adId, creatorId } },
      data: {
        contentStatus: "pending_video",
        videoUrl: null,
        videoSubmittedAt: null,
        contentReviewDeadline: null,
        videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
  });
});

// ─── DELETE tests ────────────────────────────────────────────────────────────

describe("DELETE /api/tasks/[id]/apply", () => {
  it("returns 401 if not authenticated", async () => {
    const res = await applyDelete(deleteReq(), { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 if creator never applied", async () => {
    const stranger = await createTestUser({ name: "Stranger Delete" });
    trackUser(stranger.user.id);
    const req = buildRequest(`/api/tasks/${adId}/apply`, {
      method: "DELETE",
      token: stranger.token,
    });
    const res = await applyDelete(req, { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(400);
  });

  it("creator2 can withdraw their application", async () => {
    const req = buildRequest(`/api/tasks/${adId}/apply`, {
      method: "DELETE",
      token: creator2Token,
    });
    const res = await applyDelete(req, { params: Promise.resolve({ id: adId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify removed from DB
    const app = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId: creator2Id } },
    });
    expect(app).toBeNull();
  });
});
