/**
 * Integration tests — GET /api/balance
 *                   + POST /api/balance/withdraw
 *
 * Covers: balance creation on first fetch, transaction history,
 * withdrawal validation, balance deduction, withdrawal request in DB,
 * insufficient funds, minimum amount enforcement.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  trackUser,
  cleanup,
  buildRequest,
  cleanupBalance,
} from "../../helpers";
import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/constants";

import { GET as balanceGet } from "@/app/api/balance/route";
import { POST as withdrawPost } from "@/app/api/balance/withdraw/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let userToken: string;
let userId: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const user = await createTestUser({ name: "Balance User" });
  trackUser(user.user.id);
  userToken = user.token;
  userId = user.user.id;
});

afterAll(async () => {
  await cleanupBalance(userId);
  await cleanup();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function balanceReq(token?: string, page = 1) {
  return buildRequest(`/api/balance?page=${page}&limit=20`, { token });
}

function withdrawReq(token: string | undefined, body: unknown) {
  return buildRequest("/api/balance/withdraw", {
    method: "POST",
    token,
    body,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/balance", () => {
  it("returns 401 if not authenticated", async () => {
    const res = await balanceGet(balanceReq());
    expect(res.status).toBe(401);
  });

  it("creates balance on first fetch and returns 0", async () => {
    const res = await balanceGet(balanceReq(userToken));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.balance.current).toBe(0);
    expect(body.balance.totalEarned).toBe(0);
    expect(body.balance.totalWithdrawn).toBe(0);
    expect(body.transactions.data).toEqual([]);
    expect(body.transactions.pagination.total).toBe(0);

    // Verify balance created in DB
    const bal = await prisma.creatorBalance.findUnique({ where: { userId } });
    expect(bal).not.toBeNull();
    expect(bal!.balance).toBe(0);
  });

  it("returns correct balance after manual credit", async () => {
    // Simulate earnings by directly crediting balance
    const bal = await prisma.creatorBalance.findUnique({ where: { userId } });
    await prisma.creatorBalance.update({
      where: { userId },
      data: { balance: 5_000, totalEarned: 5_000 },
    });
    await prisma.balanceTransaction.create({
      data: {
        balanceId: bal!.id,
        type: "earning",
        amount: 5_000,
        description: "Test earning for Task X — 25 000 просмотров",
      },
    });

    const res = await balanceGet(balanceReq(userToken));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.balance.current).toBe(5_000);
    expect(body.balance.totalEarned).toBe(5_000);
    expect(body.transactions.data).toHaveLength(1);
    expect(body.transactions.data[0].type).toBe("earning");
    expect(body.transactions.data[0].amount).toBe(5_000);
  });
});

describe("POST /api/balance/withdraw", () => {
  it("returns 401 if not authenticated", async () => {
    const res = await withdrawPost(withdrawReq(undefined, { amount: 1_000, method: "kaspi", details: "+77001234567" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 if amount is below minimum", async () => {
    const res = await withdrawPost(
      withdrawReq(userToken, {
        amount: MIN_WITHDRAWAL_AMOUNT - 1,
        method: "kaspi",
        details: "+77001234567",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/минимальная/i);
  });

  it("returns 400 if method is invalid", async () => {
    const res = await withdrawPost(
      withdrawReq(userToken, {
        amount: 1_000,
        method: "bitcoin",
        details: "+77001234567",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 if details are missing", async () => {
    const res = await withdrawPost(
      withdrawReq(userToken, {
        amount: 1_000,
        method: "kaspi",
        details: "",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 if insufficient balance", async () => {
    // Balance is 5_000, try to withdraw 10_000
    const res = await withdrawPost(
      withdrawReq(userToken, {
        amount: 10_000,
        method: "kaspi",
        details: "+77001234567",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/недостаточно средств/i);
  });

  it("creates WithdrawalRequest and deducts balance", async () => {
    const balBefore = await prisma.creatorBalance.findUnique({ where: { userId } });

    const res = await withdrawPost(
      withdrawReq(userToken, {
        amount: 2_000,
        method: "kaspi",
        details: "+77009998877",
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.amount).toBe(2_000);
    expect(body.method).toBe("kaspi");
    expect(body.details).toBe("+77009998877");
    expect(body.status).toBe("processing");

    // Verify balance deducted
    const balAfter = await prisma.creatorBalance.findUnique({ where: { userId } });
    expect(balAfter!.balance).toBe(balBefore!.balance - 2_000);
    expect(balAfter!.totalWithdrawn).toBe(balBefore!.totalWithdrawn + 2_000);

    // Verify WithdrawalRequest in DB
    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: body.id } });
    expect(wr).not.toBeNull();
    expect(wr!.amount).toBe(2_000);
    expect(wr!.status).toBe("processing");
    expect(wr!.userId).toBe(userId);

    // Verify transaction record
    const bal = await prisma.creatorBalance.findUnique({ where: { userId } });
    const tx = await prisma.balanceTransaction.findFirst({
      where: { balanceId: bal!.id, type: "withdrawal" },
      orderBy: { createdAt: "desc" },
    });
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(-2_000);
    expect(tx!.withdrawalId).toBe(body.id);
  });

  it("GET balance reflects withdrawal transaction in history", async () => {
    const res = await balanceGet(balanceReq(userToken));
    expect(res.status).toBe(200);

    const body = await res.json();
    // Should have: 1 earning + 1 withdrawal = 2 transactions
    expect(body.transactions.data.length).toBeGreaterThanOrEqual(2);
    const withdrawalTx = body.transactions.data.find((t: { type: string }) => t.type === "withdrawal");
    expect(withdrawalTx).toBeDefined();
    expect(withdrawalTx.amount).toBe(-2_000);
  });
});
