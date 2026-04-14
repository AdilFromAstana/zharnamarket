/**
 * Integration tests — GET /api/admin/withdrawals
 *                   + POST /api/admin/withdrawals/[id]/process
 *
 * Covers: auth (admin only), listing by status, complete/fail actions,
 * balance refund on fail, BalanceTransaction recorded.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  createAdminUser,
  trackUser,
  cleanup,
  buildRequest,
  cleanupBalance,
} from "../../helpers";

import { GET as withdrawalsGet } from "@/app/api/admin/withdrawals/route";
import { POST as processPost } from "@/app/api/admin/withdrawals/[id]/process/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let adminToken: string;
let userToken: string;
let userId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const admin = await createAdminUser({ name: "Withdrawal Admin" });
  trackUser(admin.user.id);
  adminToken = admin.token;

  const user = await createTestUser({ name: "Withdrawal Creator" });
  trackUser(user.user.id);
  userToken = user.token;
  userId = user.user.id;
});

afterAll(async () => {
  await cleanupBalance(userId);
  await cleanup();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a balance + pending withdrawal for a user */
async function seedWithdrawal(amount: number) {
  const bal = await prisma.creatorBalance.upsert({
    where: { userId },
    create: { userId, balance: amount, totalEarned: amount },
    update: { balance: { increment: amount }, totalEarned: { increment: amount } },
  });

  const wr = await prisma.withdrawalRequest.create({
    data: {
      balanceId: bal.id,
      userId,
      amount,
      method: "kaspi",
      details: "+77001234567",
      status: "pending",
    },
  });

  // Deduct from balance (simulating what /api/balance/withdraw does)
  await prisma.creatorBalance.update({
    where: { userId },
    data: { balance: { decrement: amount }, totalWithdrawn: { increment: amount } },
  });

  await prisma.balanceTransaction.create({
    data: {
      balanceId: bal.id,
      type: "withdrawal",
      amount: -amount,
      description: `Вывод ${amount} ₸ на kaspi`,
      withdrawalId: wr.id,
    },
  });

  return wr;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/admin/withdrawals", () => {
  it("returns 401 if not authenticated", async () => {
    const req = buildRequest("/api/admin/withdrawals", { token: undefined });
    const res = await withdrawalsGet(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 if non-admin user", async () => {
    const req = buildRequest("/api/admin/withdrawals", { token: userToken });
    const res = await withdrawalsGet(req);
    expect(res.status).toBe(401);
  });

  it("returns paginated withdrawal list for admin", async () => {
    const wr = await seedWithdrawal(1_000);

    const req = buildRequest("/api/admin/withdrawals?status=pending&page=1&limit=20", {
      token: adminToken,
    });
    const res = await withdrawalsGet(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);

    const found = body.data.find((w: { id: string }) => w.id === wr.id);
    expect(found).toBeDefined();
    expect(found.amount).toBe(1_000);
    expect(found.method).toBe("kaspi");
    expect(found.status).toBe("pending");
    expect(found.user.email).toBeDefined();
  });
});

describe("POST /api/admin/withdrawals/[id]/process", () => {
  it("returns 401 if not authenticated", async () => {
    const wr = await seedWithdrawal(500);
    const req = buildRequest(`/api/admin/withdrawals/${wr.id}/process`, {
      method: "POST",
      body: { action: "complete" },
    });
    const res = await processPost(req, { params: Promise.resolve({ id: wr.id }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 if action is invalid", async () => {
    const wr = await seedWithdrawal(500);
    const req = buildRequest(`/api/admin/withdrawals/${wr.id}/process`, {
      method: "POST",
      token: adminToken,
      body: { action: "approve" }, // invalid
    });
    const res = await processPost(req, { params: Promise.resolve({ id: wr.id }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 if withdrawal does not exist", async () => {
    const req = buildRequest("/api/admin/withdrawals/nonexistent-id/process", {
      method: "POST",
      token: adminToken,
      body: { action: "complete" },
    });
    const res = await processPost(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
    expect(res.status).toBe(400);
  });

  describe("action=complete", () => {
    it("marks withdrawal as completed", async () => {
      const wr = await seedWithdrawal(2_000);

      const req = buildRequest(`/api/admin/withdrawals/${wr.id}/process`, {
        method: "POST",
        token: adminToken,
        body: { action: "complete" },
      });
      const res = await processPost(req, { params: Promise.resolve({ id: wr.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.action).toBe("complete");

      const wrAfter = await prisma.withdrawalRequest.findUnique({ where: { id: wr.id } });
      expect(wrAfter!.status).toBe("completed");
      expect(wrAfter!.processedAt).toBeInstanceOf(Date);
    });

    it("returns 400 if withdrawal already completed", async () => {
      // Find the completed withdrawal from previous test
      const completed = await prisma.withdrawalRequest.findFirst({
        where: { userId, status: "completed" },
        orderBy: { createdAt: "desc" },
      });

      const req = buildRequest(`/api/admin/withdrawals/${completed!.id}/process`, {
        method: "POST",
        token: adminToken,
        body: { action: "complete" },
      });
      const res = await processPost(req, { params: Promise.resolve({ id: completed!.id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/уже обработан/i);
    });
  });

  describe("action=fail", () => {
    it("marks withdrawal as failed AND refunds balance", async () => {
      const refundAmount = 3_000;
      const wr = await seedWithdrawal(refundAmount);

      const balBefore = await prisma.creatorBalance.findUnique({ where: { userId } });

      const req = buildRequest(`/api/admin/withdrawals/${wr.id}/process`, {
        method: "POST",
        token: adminToken,
        body: { action: "fail" },
      });
      const res = await processPost(req, { params: Promise.resolve({ id: wr.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.action).toBe("fail");

      // Withdrawal status
      const wrAfter = await prisma.withdrawalRequest.findUnique({ where: { id: wr.id } });
      expect(wrAfter!.status).toBe("failed");

      // Balance should be restored
      const balAfter = await prisma.creatorBalance.findUnique({ where: { userId } });
      expect(balAfter!.balance).toBe(balBefore!.balance + refundAmount);
      expect(balAfter!.totalWithdrawn).toBe(balBefore!.totalWithdrawn - refundAmount);

      // Refund transaction
      const bal = await prisma.creatorBalance.findUnique({ where: { userId } });
      const refundTx = await prisma.balanceTransaction.findFirst({
        where: { balanceId: bal!.id, type: "refund", withdrawalId: wr.id },
      });
      expect(refundTx).not.toBeNull();
      expect(refundTx!.amount).toBe(refundAmount);
    });
  });
});
