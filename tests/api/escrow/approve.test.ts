/**
 * Integration tests — POST /api/admin/submissions/[id]/approve
 *
 * Covers: auth (admin only), validation, atomic payout calculation,
 * escrow deduction, creator balance credit, transaction record,
 * budget_exhausted auto-status when escrow drains.
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
  cleanupBalance,
} from "../../helpers";

import { POST as approvePost } from "@/app/api/admin/submissions/[id]/approve/route";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";

// ─── Shared state ────────────────────────────────────────────────────────────

let adminToken: string;
let adminId: string;
let userToken: string;
let advertiserId: string;
let creatorId: string;

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const admin = await createAdminUser({ name: "Moderator Admin" });
  trackUser(admin.user.id);
  adminToken = admin.token;
  adminId = admin.user.id;

  const user = await createTestUser({ name: "Regular User" });
  trackUser(user.user.id);
  userToken = user.token;

  const advertiser = await createTestUser({ name: "Adv Approve" });
  trackUser(advertiser.user.id);
  advertiserId = advertiser.user.id;

  const creator = await createTestUser({ name: "Creator Approve" });
  trackUser(creator.user.id);
  creatorId = creator.user.id;
});

afterAll(async () => {
  await cleanupBalance(creatorId);
  await cleanup();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function approveReq(submissionId: string, token: string | undefined, approvedViews: number) {
  return buildRequest(`/api/admin/submissions/${submissionId}/approve`, {
    method: "POST",
    token,
    body: { approvedViews },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/submissions/[id]/approve", () => {
  describe("Auth & Validation", () => {
    it("returns 401 if not authenticated", async () => {
      const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 5_000 });
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId, { claimedViews: 10_000 });

      const res = await approvePost(approveReq(sub.id, undefined, 10_000), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(401);

      await cleanupBalance(creatorId);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 401 if non-admin tries to approve", async () => {
      const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 5_000 });
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId, { claimedViews: 10_000 });

      const res = await approvePost(approveReq(sub.id, userToken, 10_000), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(401);

      await cleanupBalance(creatorId);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if approvedViews is missing", async () => {
      const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 5_000 });
      const app = await createApplication(ad.id, creatorId);
      const sub = await createSubmission(app, creatorId, { claimedViews: 10_000 });

      const req = buildRequest(`/api/admin/submissions/${sub.id}/approve`, {
        method: "POST",
        token: adminToken,
        body: {},
      });
      const res = await approvePost(req, { params: Promise.resolve({ id: sub.id }) });
      expect(res.status).toBe(400);

      await cleanupBalance(creatorId);
      await cleanupEscrowAd(ad.id);
    });

    it("returns 400 if submission does not exist", async () => {
      const res = await approvePost(
        approveReq("nonexistent-sub-id", adminToken, 10_000),
        { params: Promise.resolve({ id: "nonexistent-sub-id" }) },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Payout calculation + atomic transaction", () => {
    let adId: string;

    afterAll(async () => {
      await cleanupBalance(creatorId);
      if (adId) await cleanupEscrowAd(adId);
    });

    it("approves submission, deducts escrow, credits creator balance", async () => {
      // RPM=200, budget=50_000
      const { ad, escrow } = await createEscrowAd(advertiserId, {
        rpm: 200,
        totalBudget: 50_000,
      });
      adId = ad.id;

      const app = await createApplication(adId, creatorId);
      // claimedViews=25_000, reservedAmount=(25000/1000)*200=5000
      const sub = await createSubmission(app, creatorId, {
        claimedViews: 25_000,
        reservedAmount: 5_000,
      });

      const escrowBefore = await prisma.escrowAccount.findUnique({ where: { adId } });

      const res = await approvePost(approveReq(sub.id, adminToken, 25_000), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      // gross = (25000/1000)*200 = 5000
      const expectedCommission = 5_000 * PLATFORM_COMMISSION_RATE;
      const expectedPayout = 5_000 - expectedCommission;
      expect(body.approvedViews).toBe(25_000);
      expect(body.grossAmount).toBe(5_000);
      expect(body.commissionAmount).toBeCloseTo(expectedCommission, 1);
      expect(body.payoutAmount).toBeCloseTo(expectedPayout, 1);

      // Verify submission updated
      const subAfter = await prisma.videoSubmission.findUnique({ where: { id: sub.id } });
      expect(subAfter!.status).toBe("approved");
      expect(subAfter!.approvedViews).toBe(25_000);
      expect(subAfter!.payoutAmount).toBeCloseTo(expectedPayout, 1);
      expect(subAfter!.commissionAmount).toBeCloseTo(expectedCommission, 1);
      expect(subAfter!.grossAmount).toBe(5_000);
      expect(subAfter!.moderatorId).toBe(adminId);
      expect(subAfter!.moderatedAt).toBeInstanceOf(Date);

      // Verify escrow: reservedAmount decremented, spentAmount incremented
      const escrowAfter = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrowAfter!.reservedAmount).toBe(escrowBefore!.reservedAmount - 5_000);
      expect(escrowAfter!.spentAmount).toBe(escrowBefore!.spentAmount + 5_000);

      // Verify creator balance
      const balance = await prisma.creatorBalance.findUnique({ where: { userId: creatorId } });
      expect(balance).not.toBeNull();
      expect(balance!.balance).toBeCloseTo(expectedPayout, 1);
      expect(balance!.totalEarned).toBeCloseTo(expectedPayout, 1);

      // Verify BalanceTransaction
      const tx = await prisma.balanceTransaction.findFirst({
        where: { balanceId: balance!.id, type: "earning", submissionId: sub.id },
      });
      expect(tx).not.toBeNull();
      expect(tx!.amount).toBeCloseTo(expectedPayout, 1);
      expect(tx!.description).toContain("Test Escrow Ad");
    });

    it("returns 400 if submission already approved", async () => {
      // Find the submission we just approved
      const balance = await prisma.creatorBalance.findUnique({ where: { userId: creatorId } });
      const tx = await prisma.balanceTransaction.findFirst({
        where: { balanceId: balance!.id, type: "earning" },
        include: { balance: true },
      });
      const sub = await prisma.videoSubmission.findFirst({
        where: { adId, status: "approved" },
      });

      const res = await approvePost(approveReq(sub!.id, adminToken, 25_000), {
        params: Promise.resolve({ id: sub!.id }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже обработана/i);
    });
  });

  describe("Budget exhaustion on approval", () => {
    it("marks ad as budget_exhausted when escrow drains to 0", async () => {
      // Very small budget — exactly covers one submission
      const { ad } = await createEscrowAd(advertiserId, {
        rpm: 100,
        totalBudget: 1_000, // exactly 10_000 views at RPM 100
      });

      const app = await createApplication(ad.id, creatorId);
      // Reserve all of available (1000)
      const sub = await createSubmission(app, creatorId, {
        claimedViews: 10_000,
        reservedAmount: 1_000, // all remaining budget
      });

      // Verify escrow has 0 available after reservation
      const escrow = await prisma.escrowAccount.findUnique({ where: { adId: ad.id } });
      expect(escrow!.available).toBe(0);
      expect(escrow!.reservedAmount).toBe(1_000);

      const res = await approvePost(approveReq(sub.id, adminToken, 10_000), {
        params: Promise.resolve({ id: sub.id }),
      });
      expect(res.status).toBe(200);

      // Ad should now be budget_exhausted
      const adAfter = await prisma.ad.findUnique({ where: { id: ad.id } });
      expect(adAfter!.status).toBe("budget_exhausted");

      const escrowAfter = await prisma.escrowAccount.findUnique({ where: { adId: ad.id } });
      expect(escrowAfter!.status).toBe("exhausted");

      await cleanupBalance(creatorId);
      await cleanupEscrowAd(ad.id);
    });
  });
});
