/**
 * Integration tests — POST /api/tasks/[id]/cancel
 *
 * Covers: auth, ownership check, escrow-only, pending-submissions block,
 * refund amount returned, ad status set to cancelled.
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
  createSubmission,
  cleanupEscrowAd,
} from "../../helpers";
import { cityId, categoryId } from "../refs";

import { POST as cancelPost } from "@/app/api/tasks/[id]/cancel/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let ownerToken: string;
let ownerId: string;
let otherToken: string;
let creatorId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const owner = await createTestUser({ name: "Cancel Owner" });
  trackUser(owner.user.id);
  ownerToken = owner.token;
  ownerId = owner.user.id;

  const other = await createTestUser({ name: "Cancel Other" });
  trackUser(other.user.id);
  otherToken = other.token;

  const creator = await createTestUser({ name: "Cancel Creator" });
  trackUser(creator.user.id);
  creatorId = creator.user.id;
});

afterAll(async () => {
  await cleanup();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function cancelReq(adId: string, token?: string) {
  return buildRequest(`/api/tasks/${adId}/cancel`, {
    method: "POST",
    token,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/tasks/[id]/cancel", () => {
  describe("Auth & Guards", () => {
    it("returns 401 if not authenticated", async () => {
      const { ad } = await createEscrowAd(ownerId);
      const res = await cancelPost(cancelReq(ad.id), {
        params: Promise.resolve({ id: ad.id }),
      });
      expect(res.status).toBe(401);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if ad does not exist", async () => {
      const res = await cancelPost(cancelReq("nonexistent-ad-id", ownerToken), {
        params: Promise.resolve({ id: "nonexistent-ad-id" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 if requester is not the owner", async () => {
      const { ad } = await createEscrowAd(ownerId);
      const res = await cancelPost(cancelReq(ad.id, otherToken), {
        params: Promise.resolve({ id: ad.id }),
      });
      expect(res.status).toBe(400);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if ad is not escrow mode", async () => {
      const directAd = await prisma.ad.create({
        data: {
          ownerId,
          title: "Direct Ad Cancel",
          description: "Direct ad cancel test",
          platform: "TikTok",
          cityId: await cityId("Almaty"),
          categoryId: await categoryId("Memy"),
          status: "active",
          budgetType: "per_views",
          paymentMode: "direct",
        },
      });
      const res = await cancelPost(cancelReq(directAd.id, ownerToken), {
        params: Promise.resolve({ id: directAd.id }),
      });
      expect(res.status).toBe(400);
      await prisma.ad.delete({ where: { id: directAd.id } });
    });

    it("returns 400 if there are pending submissions on moderation", async () => {
      const { ad } = await createEscrowAd(ownerId, { rpm: 100, totalBudget: 10_000 });
      const app = await createApplication(ad.id, creatorId);
      // This creates a submission with status=submitted and makes a reservation
      await createSubmission(app, creatorId, { claimedViews: 5_000, reservedAmount: 500 });

      const res = await cancelPost(cancelReq(ad.id, ownerToken), {
        params: Promise.resolve({ id: ad.id }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/подачи на модерации/i);

      await cleanupEscrowAd(ad.id);
    });
  });

  describe("Successful cancellation", () => {
    it("cancels task and sets escrow available to 0", async () => {
      const { ad } = await createEscrowAd(ownerId, {
        rpm: 100,
        totalBudget: 20_000,
      });

      // Spend some of budget (simulate a previous approved submission)
      await prisma.escrowAccount.update({
        where: { adId: ad.id },
        data: { spentAmount: 5_000, available: 15_000 },
      });

      const res = await cancelPost(cancelReq(ad.id, ownerToken), {
        params: Promise.resolve({ id: ad.id }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.refundAmount).toBe(15_000); // remaining available
      expect(body.spentAmount).toBe(5_000);

      // Verify ad is cancelled
      const adAfter = await prisma.ad.findUnique({ where: { id: ad.id } });
      expect(adAfter!.status).toBe("cancelled");

      // Verify escrow available is 0 and status cancelled
      const escrowAfter = await prisma.escrowAccount.findUnique({ where: { adId: ad.id } });
      expect(escrowAfter!.available).toBe(0);
      expect(escrowAfter!.status).toBe("cancelled");

      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if ad is already cancelled", async () => {
      const { ad } = await createEscrowAd(ownerId);

      // Cancel first time
      await cancelPost(cancelReq(ad.id, ownerToken), {
        params: Promise.resolve({ id: ad.id }),
      });

      // Cancel again
      const res = await cancelPost(cancelReq(ad.id, ownerToken), {
        params: Promise.resolve({ id: ad.id }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже отменено/i);

      await cleanupEscrowAd(ad.id);
    });
  });
});
