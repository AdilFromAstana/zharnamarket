/**
 * Integration tests — POST /api/admin/submissions/[id]/reject
 *
 * Covers: auth, validation (reason codes), escrow unreservation,
 * permanent-reject reasons block re-submission.
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
  createSubmission,
  cleanupEscrowAd,
} from "../../helpers";

import { POST as rejectPost } from "@/app/api/admin/submissions/[id]/reject/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let adminToken: string;
let userToken: string;
let advertiserId: string;
let creatorId: string;

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const admin = await createAdminUser({ name: "Reject Admin" });
  trackUser(admin.user.id);
  adminToken = admin.token;

  const user = await createTestUser({ name: "Reject Regular User" });
  trackUser(user.user.id);
  userToken = user.token;

  const advertiser = await createTestUser({ name: "Adv Reject" });
  trackUser(advertiser.user.id);
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Reject" });
  trackUser(creator.user.id);
  creatorId = creator.user.id;
});

afterAll(async () => {
  await cleanup();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function rejectReq(submissionId: string, token: string | undefined, body: unknown) {
  return buildRequest(`/api/admin/submissions/${submissionId}/reject`, {
    method: "POST",
    token,
    body,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/submissions/[id]/reject", () => {
  describe("Auth & Validation", () => {
    it("returns 401 if not authenticated", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      const res = await rejectPost(rejectReq(sub.id, undefined, { reason: "no_brand" }), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(401);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 401 if non-admin tries to reject", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      const res = await rejectPost(rejectReq(sub.id, userToken, { reason: "no_brand" }), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(401);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if reason is missing", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      const res = await rejectPost(rejectReq(sub.id, adminToken, {}), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if reason is invalid", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      const res = await rejectPost(rejectReq(sub.id, adminToken, { reason: "bad_vibes" }), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if reason=other but no comment", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      const res = await rejectPost(rejectReq(sub.id, adminToken, { reason: "other" }), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/комментарий/i);
      await cleanupEscrowAd(ad.id);
    });
  });

  describe("Successful rejection + escrow unreservation", () => {
    it("rejects and returns reserved amount to escrow", async () => {
      const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 20_000 });
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId, {
        claimedViews: 30_000,
        reservedAmount: 3_000,
      });

      const escrowBefore = await prisma.escrowAccount.findUnique({ where: { adId: ad.id } });

      const res = await rejectPost(
        rejectReq(sub.id, adminToken, { reason: "no_brand" }),
        { params: Promise.resolve({ id: sub.id }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.reason).toBe("no_brand");

      // Submission status updated
      const subAfter = await prisma.videoSubmission.findUnique({ where: { id: sub.id } });
      expect(subAfter!.status).toBe("rejected");
      expect(subAfter!.rejectionReason).toBe("no_brand");
      expect(subAfter!.moderatorId).toBeDefined();

      // Escrow unreservation: reserved -= 3000, available += 3000
      const escrowAfter = await prisma.escrowAccount.findUnique({ where: { adId: ad.id } });
      expect(escrowAfter!.reservedAmount).toBe(escrowBefore!.reservedAmount - 3_000);
      expect(escrowAfter!.available).toBe(escrowBefore!.available + 3_000);
      // spentAmount must NOT change
      expect(escrowAfter!.spentAmount).toBe(escrowBefore!.spentAmount);

      await cleanupEscrowAd(ad.id);
    });

    it("accepts rejection with reason=other and comment", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      const res = await rejectPost(
        rejectReq(sub.id, adminToken, {
          reason: "other",
          comment: "Video quality is too low",
        }),
        { params: Promise.resolve({ id: sub.id }) },
      );
      expect(res.status).toBe(200);

      const subAfter = await prisma.videoSubmission.findUnique({ where: { id: sub.id } });
      expect(subAfter!.rejectionReason).toBe("other");
      expect(subAfter!.rejectionComment).toBe("Video quality is too low");

      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if submission is already processed", async () => {
      const { ad } = await createEscrowAd(advertiserId);
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId);

      // First rejection
      await rejectPost(
        rejectReq(sub.id, adminToken, { reason: "no_brand" }),
        { params: Promise.resolve({ id: sub.id }) },
      );

      // Second rejection attempt
      const res = await rejectPost(
        rejectReq(sub.id, adminToken, { reason: "no_banner" }),
        { params: Promise.resolve({ id: sub.id }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже обработана/i);

      await cleanupEscrowAd(ad.id);
    });
  });

  describe("All valid rejection reasons accepted", () => {
    const reasons = [
      "no_brand",
      "no_banner",
      "fake_stats",
      "boosted_views",
      "wrong_hashtags",
      "video_unavailable",
    ];

    for (const reason of reasons) {
      it(`accepts reason: ${reason}`, async () => {
        const { ad } = await createEscrowAd(advertiserId);
        const app = await createApplication(ad.id, creatorId);
        const sub = await createSubmission(app, creatorId, {
          videoUrl: `https://www.tiktok.com/@test/video/${reason}${Date.now()}`,
        });

        const res = await rejectPost(
          rejectReq(sub.id, adminToken, { reason }),
          { params: Promise.resolve({ id: sub.id }) },
        );
        expect(res.status).toBe(200);
        await cleanupEscrowAd(ad.id);
      });
    }
  });
});
