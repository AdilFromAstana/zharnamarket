/**
 * Integration tests — GET /api/tasks/[id]/applications
 *                     PATCH /api/tasks/[id]/applications/[appId]/review
 *
 * Covers:
 *   GET  — auth, owner-only, escrow-only, list with creator fields,
 *           lazy-check of both deadline types.
 *   PATCH — auth, owner-only, wrong appId, invalid action,
 *            wrong contentStatus guard, approve, reject (with/without note),
 *            lazy auto-approve when 72h expired.
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

import { GET as listApplications } from "@/app/api/tasks/[id]/applications/route";
import { PATCH as reviewApplication } from "@/app/api/tasks/[id]/applications/[appId]/review/route";

// ─── Shared state ─────────────────────────────────────────────────────────────

let advertiserToken: string;
let advertiserId: string;
let creatorToken: string;
let creatorId: string;
let outsiderToken: string;

let adId: string;
let directAdId: string;
let appId: string;

// ─── Setup & Cleanup ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const advertiser = await createTestUser({ name: "Adv Applications" });
  trackUser(advertiser.user.id);
  advertiserToken = advertiser.token;
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Applications" });
  trackUser(creator.user.id);
  creatorToken = creator.token;
  creatorId = creator.user.id;

  const outsider = await createTestUser({ name: "Outsider Applications" });
  trackUser(outsider.user.id);
  outsiderToken = outsider.token;

  // Escrow ad for main tests
  const { ad } = await createEscrowAd(advertiserId);
  adId = ad.id;

  // Direct ad to test escrow-only guard
  const direct = await prisma.ad.create({
    data: {
      ownerId: advertiserId,
      title: "Direct Ad Apps",
      description: "Direct contact",
      platform: "TikTok",
      city: "Almaty",
      category: "Memy",
      status: "active",
      budgetType: "per_views",
      paymentMode: "direct",
    },
  });
  directAdId = direct.id;

  // Pre-create one application for the creator
  const app = await createApplication(adId, creatorId, "pending_review", {
    videoUrl: "https://tiktok.com/@creator/video/main",
    videoSubmittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    contentReviewDeadline: new Date(Date.now() + 70 * 60 * 60 * 1000),
  });
  appId = app.id;
});

afterAll(async () => {
  await prisma.ad.delete({ where: { id: directAdId } }).catch(() => {});
  await cleanupEscrowAd(adId);
  await cleanup();
});

// ─── GET /api/tasks/[id]/applications ─────────────────────────────────────────

describe("GET /api/tasks/[id]/applications", () => {
  function listReq(token?: string, id = adId) {
    return buildRequest(`/api/tasks/${id}/applications`, { method: "GET", token });
  }

  it("returns 401 if not authenticated", async () => {
    const res = await listApplications(listReq(), {
      params: Promise.resolve({ id: adId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 if non-owner calls", async () => {
    const res = await listApplications(listReq(outsiderToken), {
      params: Promise.resolve({ id: adId }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/нет доступа/i);
  });

  it("returns 400 if creator (non-owner) tries to list applications", async () => {
    const res = await listApplications(listReq(creatorToken), {
      params: Promise.resolve({ id: adId }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/нет доступа/i);
  });

  it("returns 400 for direct (non-escrow) ad", async () => {
    const res = await listApplications(listReq(advertiserToken, directAdId), {
      params: Promise.resolve({ id: directAdId }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/escrow/i);
  });

  it("returns 200 with an array including creator fields and submission", async () => {
    const res = await listApplications(listReq(advertiserToken), {
      params: Promise.resolve({ id: adId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const found = body.data.find((a: { id: string }) => a.id === appId);
    expect(found).toBeDefined();
    expect(found.creator).toBeDefined();
    expect(found.creator.id).toBe(creatorId);
    expect(found.creator.name).toBe("Creator Applications");
    // submission field present (null since we haven't created one)
    expect("submission" in found).toBe(true);
  });

  it("lazy-check: updates pending_video with expired videoDeadline to video_timed_out", async () => {
    const lazyCreator = await createTestUser({ name: "Lazy TimedOut" });
    trackUser(lazyCreator.user.id);
    const lazyApp = await createApplication(adId, lazyCreator.user.id, "pending_video", {
      videoDeadline: new Date(Date.now() - 1000), // expired
    });

    const res = await listApplications(listReq(advertiserToken), {
      params: Promise.resolve({ id: adId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    const found = body.data.find((a: { id: string }) => a.id === lazyApp.id);
    expect(found).toBeDefined();
    expect(found.contentStatus).toBe("video_timed_out");

    // Verify DB updated
    const dbApp = await prisma.taskApplication.findUnique({ where: { id: lazyApp.id } });
    expect(dbApp!.contentStatus).toBe("video_timed_out");
  });

  it("lazy-check: updates pending_review with expired contentReviewDeadline to content_approved", async () => {
    const lazyCreator2 = await createTestUser({ name: "Lazy AutoApprove" });
    trackUser(lazyCreator2.user.id);
    const lazyApp2 = await createApplication(adId, lazyCreator2.user.id, "pending_review", {
      videoUrl: "https://tiktok.com/@lazy/video/autoapprove",
      videoSubmittedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
      contentReviewDeadline: new Date(Date.now() - 1000), // expired
    });

    const res = await listApplications(listReq(advertiserToken), {
      params: Promise.resolve({ id: adId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    const found = body.data.find((a: { id: string }) => a.id === lazyApp2.id);
    expect(found).toBeDefined();
    expect(found.contentStatus).toBe("content_approved");

    // Verify DB updated
    const dbApp = await prisma.taskApplication.findUnique({ where: { id: lazyApp2.id } });
    expect(dbApp!.contentStatus).toBe("content_approved");
  });
});

// ─── PATCH /api/tasks/[id]/applications/[appId]/review ────────────────────────

describe("PATCH /api/tasks/[id]/applications/[appId]/review", () => {
  function reviewReq(
    token: string | undefined,
    body: unknown,
    id = adId,
    aid = appId,
  ) {
    return buildRequest(`/api/tasks/${id}/applications/${aid}/review`, {
      method: "PATCH",
      token,
      body,
    });
  }

  function paramsFor(id: string, aid: string) {
    return { params: Promise.resolve({ id, appId: aid }) };
  }

  it("returns 401 if not authenticated", async () => {
    const res = await reviewApplication(
      reviewReq(undefined, { action: "approve" }),
      paramsFor(adId, appId),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 if non-owner calls", async () => {
    const res = await reviewApplication(
      reviewReq(outsiderToken, { action: "approve" }),
      paramsFor(adId, appId),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/нет доступа/i);
  });

  it("returns 400 if action is missing", async () => {
    const res = await reviewApplication(
      reviewReq(advertiserToken, {}),
      paramsFor(adId, appId),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/action/i);
  });

  it("returns 400 if action is invalid", async () => {
    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "maybe" }),
      paramsFor(adId, appId),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/action/i);
  });

  it("returns 400 if appId does not belong to this task", async () => {
    const { ad: otherAd } = await createEscrowAd(advertiserId);
    const otherApp = await createApplication(otherAd.id, creatorId, "pending_review", {
      videoUrl: "https://tiktok.com/@other/video/wrongtask",
      contentReviewDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "approve" }, adId, otherApp.id),
      paramsFor(adId, otherApp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/не принадлежит/i);

    await cleanupEscrowAd(otherAd.id);
  });

  it("returns 400 if application is not in pending_review status (e.g. pending_video)", async () => {
    const notReviewCreator = await createTestUser({ name: "NotReview Reviewer" });
    trackUser(notReviewCreator.user.id);
    const notReviewApp = await createApplication(adId, notReviewCreator.user.id, "pending_video", {
      videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "approve" }, adId, notReviewApp.id),
      paramsFor(adId, notReviewApp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/не ожидает проверки/i);
  });

  it("approve: transitions to content_approved and sets contentReviewedAt", async () => {
    // Create a fresh pending_review application for this test
    const approveCreator = await createTestUser({ name: "ToApprove Reviewer" });
    trackUser(approveCreator.user.id);
    const approveApp = await createApplication(adId, approveCreator.user.id, "pending_review", {
      videoUrl: "https://tiktok.com/@approve/video/999",
      videoSubmittedAt: new Date(),
      contentReviewDeadline: new Date(Date.now() + 70 * 60 * 60 * 1000),
    });

    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "approve" }, adId, approveApp.id),
      paramsFor(adId, approveApp.id),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.contentStatus).toBe("content_approved");

    // Verify DB
    const dbApp = await prisma.taskApplication.findUnique({ where: { id: approveApp.id } });
    expect(dbApp!.contentStatus).toBe("content_approved");
    expect(dbApp!.contentReviewedAt).not.toBeNull();
    expect(dbApp!.contentRejectionNote).toBeNull();
  });

  it("reject: transitions to content_rejected and sets contentRejectionNote", async () => {
    const rejectCreator = await createTestUser({ name: "ToReject Reviewer" });
    trackUser(rejectCreator.user.id);
    const rejectApp = await createApplication(adId, rejectCreator.user.id, "pending_review", {
      videoUrl: "https://tiktok.com/@reject/video/888",
      videoSubmittedAt: new Date(),
      contentReviewDeadline: new Date(Date.now() + 70 * 60 * 60 * 1000),
    });

    const note = "Продукт не упомянут в видео, нет хэштегов";
    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "reject", note }, adId, rejectApp.id),
      paramsFor(adId, rejectApp.id),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.contentStatus).toBe("content_rejected");

    // Verify DB
    const dbApp = await prisma.taskApplication.findUnique({ where: { id: rejectApp.id } });
    expect(dbApp!.contentStatus).toBe("content_rejected");
    expect(dbApp!.contentRejectionNote).toBe(note);
    expect(dbApp!.contentReviewedAt).not.toBeNull();
  });

  it("reject without note: still succeeds (note is optional)", async () => {
    const noNoteCreator = await createTestUser({ name: "NoNote Reviewer" });
    trackUser(noNoteCreator.user.id);
    const noNoteApp = await createApplication(adId, noNoteCreator.user.id, "pending_review", {
      videoUrl: "https://tiktok.com/@nonote/video/777",
      videoSubmittedAt: new Date(),
      contentReviewDeadline: new Date(Date.now() + 70 * 60 * 60 * 1000),
    });

    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "reject" }, adId, noNoteApp.id),
      paramsFor(adId, noNoteApp.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contentStatus).toBe("content_rejected");

    const dbApp = await prisma.taskApplication.findUnique({ where: { id: noNoteApp.id } });
    expect(dbApp!.contentRejectionNote).toBeNull();
  });

  it("auto-approve: returns 200 + message when contentReviewDeadline has expired", async () => {
    const autoCreator = await createTestUser({ name: "AutoApprove Reviewer" });
    trackUser(autoCreator.user.id);
    const autoApp = await createApplication(adId, autoCreator.user.id, "pending_review", {
      videoUrl: "https://tiktok.com/@auto/video/666",
      videoSubmittedAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
      contentReviewDeadline: new Date(Date.now() - 1000), // expired
    });

    const res = await reviewApplication(
      reviewReq(advertiserToken, { action: "reject", note: "Too late" }, adId, autoApp.id),
      paramsFor(adId, autoApp.id),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.contentStatus).toBe("content_approved");
    // Should indicate auto-approval
    expect(body.message).toMatch(/авто|auto/i);

    // Verify DB was set to content_approved (not rejected, despite action="reject")
    const dbApp = await prisma.taskApplication.findUnique({ where: { id: autoApp.id } });
    expect(dbApp!.contentStatus).toBe("content_approved");
  });
});
