/**
 * Integration tests — POST /api/tasks/[id]/apply/video
 *
 * Covers: auth, application-existence guard, contentStatus guard,
 * 48h deadline lazy-check, URL validation, duplicate URL check,
 * happy path (pending_video → pending_review + contentReviewDeadline set).
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

import { POST as applyVideoPost } from "@/app/api/tasks/[id]/apply/video/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let advertiserId: string;
let creatorToken: string;
let creatorId: string;

let adId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const advertiser = await createTestUser({ name: "Adv Video" });
  trackUser(advertiser.user.id);
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Video" });
  trackUser(creator.user.id);
  creatorToken = creator.token;
  creatorId = creator.user.id;

  const { ad } = await createEscrowAd(advertiserId);
  adId = ad.id;
});

afterAll(async () => {
  await cleanupEscrowAd(adId);
  await cleanup();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function videoReq(token: string | undefined, videoUrl: string) {
  return buildRequest(`/api/tasks/${adId}/apply/video`, {
    method: "POST",
    token,
    body: { videoUrl },
  });
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_URL = "https://www.tiktok.com/@testcreator/video/1234567890123";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/tasks/[id]/apply/video", () => {
  describe("Auth & Application Guards", () => {
    it("returns 401 if not authenticated", async () => {
      const res = await applyVideoPost(videoReq(undefined, VALID_URL), paramsFor(adId));
      expect(res.status).toBe(401);
    });

    it("returns 400 if creator has no application on this task", async () => {
      const stranger = await createTestUser({ name: "Stranger Video" });
      trackUser(stranger.user.id);
      const res = await applyVideoPost(videoReq(stranger.token, VALID_URL), paramsFor(adId));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/не откликались/i);
    });

    it("returns 400 if application is not in pending_video status (e.g. pending_review)", async () => {
      // Create an application already in pending_review
      const reviewCreator = await createTestUser({ name: "ReviewCreator Video" });
      trackUser(reviewCreator.user.id);
      await createApplication(adId, reviewCreator.user.id, "pending_review", {
        videoUrl: VALID_URL,
        videoSubmittedAt: new Date(),
        contentReviewDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });

      const res = await applyVideoPost(
        videoReq(reviewCreator.token, "https://tiktok.com/@other/video/99"),
        paramsFor(adId),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/неверный статус/i);
    });

    it("returns 400 if application is content_approved", async () => {
      const approvedCreator = await createTestUser({ name: "ApprovedCreator Video" });
      trackUser(approvedCreator.user.id);
      await createApplication(adId, approvedCreator.user.id, "content_approved");

      const res = await applyVideoPost(
        videoReq(approvedCreator.token, "https://tiktok.com/@other/video/approved"),
        paramsFor(adId),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/неверный статус/i);
    });
  });

  describe("URL Validation", () => {
    it("returns 400 if videoUrl is empty", async () => {
      // Create a fresh pending_video application for these validation tests
      const valCreator = await createTestUser({ name: "Val Creator Video" });
      trackUser(valCreator.user.id);
      await createApplication(adId, valCreator.user.id, "pending_video", {
        videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const res = await applyVideoPost(videoReq(valCreator.token, ""), paramsFor(adId));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/корректную ссылку/i);
    });

    it("returns 400 if videoUrl is not a valid URL (plain text)", async () => {
      const valCreator2 = await createTestUser({ name: "Val Creator Video 2" });
      trackUser(valCreator2.user.id);
      await createApplication(adId, valCreator2.user.id, "pending_video", {
        videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const res = await applyVideoPost(
        videoReq(valCreator2.token, "not-a-valid-url"),
        paramsFor(adId),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/корректную ссылку/i);
    });
  });

  describe("48h Deadline Lazy-Check", () => {
    it("returns 400 and sets video_timed_out when videoDeadline has expired", async () => {
      const timedOutCreator = await createTestUser({ name: "TimedOut Video" });
      trackUser(timedOutCreator.user.id);
      await createApplication(adId, timedOutCreator.user.id, "pending_video", {
        videoDeadline: new Date(Date.now() - 1000), // expired
      });

      const res = await applyVideoPost(
        videoReq(timedOutCreator.token, VALID_URL),
        paramsFor(adId),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/истекло/i);

      // Verify DB was updated to video_timed_out
      const app = await prisma.taskApplication.findUnique({
        where: { adId_creatorId: { adId, creatorId: timedOutCreator.user.id } },
      });
      expect(app!.contentStatus).toBe("video_timed_out");
    });
  });

  describe("Duplicate URL Check", () => {
    it("returns 400 if videoUrl is already used in another application for this task", async () => {
      const dup1 = await createTestUser({ name: "Dup Video 1" });
      const dup2 = await createTestUser({ name: "Dup Video 2" });
      trackUser(dup1.user.id);
      trackUser(dup2.user.id);

      const sharedUrl = "https://tiktok.com/@shared/video/duplicate999";

      // dup1 already submitted this URL (pending_review)
      await createApplication(adId, dup1.user.id, "pending_review", {
        videoUrl: sharedUrl,
        videoSubmittedAt: new Date(),
        contentReviewDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });

      // dup2 is pending_video and tries to use the same URL
      await createApplication(adId, dup2.user.id, "pending_video", {
        videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const res = await applyVideoPost(videoReq(dup2.token, sharedUrl), paramsFor(adId));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже используется/i);
    });
  });

  describe("Happy path", () => {
    it("transitions application to pending_review, sets videoUrl and contentReviewDeadline", async () => {
      // Create a fresh pending_video application
      await createApplication(adId, creatorId, "pending_video", {
        videoDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      // Use a unique URL that hasn't been used in any other test
      const uniqueUrl = "https://www.tiktok.com/@uniquecreator/video/happy_path_9999";

      const before = Date.now();
      const res = await applyVideoPost(videoReq(creatorToken, uniqueUrl), paramsFor(adId));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.contentStatus).toBe("pending_review");
      expect(body.videoUrl).toBe(uniqueUrl);
      expect(body.videoSubmittedAt).toBeDefined();

      // contentReviewDeadline should be ~72h from now
      const expectedDeadline = before + 72 * 60 * 60 * 1000;
      const actualDeadline = new Date(body.contentReviewDeadline).getTime();
      expect(actualDeadline).toBeGreaterThan(expectedDeadline - 5_000);
      expect(actualDeadline).toBeLessThan(expectedDeadline + 5_000);

      // Verify DB record
      const app = await prisma.taskApplication.findUnique({
        where: { adId_creatorId: { adId, creatorId } },
      });
      expect(app!.contentStatus).toBe("pending_review");
      expect(app!.videoUrl).toBe(uniqueUrl);
      expect(app!.videoSubmittedAt).not.toBeNull();
      expect(app!.contentReviewDeadline).not.toBeNull();
    });
  });
});
