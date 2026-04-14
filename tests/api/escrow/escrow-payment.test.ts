/**
 * Integration tests — POST /api/payments/ads/[id]/escrow
 *                   + webhook escrow_deposit / escrow_topup handling
 *
 * Covers: auth, validation, session creation, escrow account creation
 * on webhook, task activation, topup, idempotency.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  trackUser,
  cleanup,
  buildRequest,
  cleanupEscrowAd,
} from "../../helpers";

import { POST as escrowPay } from "@/app/api/payments/ads/[id]/escrow/route";
import { POST as webhook } from "@/app/api/payments/webhook/route";

// ─── Shared state ────────────────────────────────────────────────────────────

let ownerToken: string;
let ownerId: string;
let otherToken: string;

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const owner = await createTestUser({ name: "Escrow Owner" });
  trackUser(owner.user.id);
  ownerToken = owner.token;
  ownerId = owner.user.id;

  const other = await createTestUser({ name: "Other User" });
  trackUser(other.user.id);
  otherToken = other.token;
});

afterAll(async () => {
  await cleanup();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createDraftEscrowAd(ownerId: string, totalBudget = 50_000) {
  return prisma.ad.create({
    data: {
      ownerId,
      title: "Draft Escrow Ad",
      description: "Draft escrow task for payment tests",
      platform: "TikTok",
      city: "Almaty",
      category: "Obzory",
      status: "draft",
      budgetType: "per_views",
      paymentMode: "escrow",
      rpm: 150,
      minViews: 1_000,
      totalBudget,
      submissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/payments/ads/[id]/escrow", () => {
  describe("Auth & Validation", () => {
    it("returns 401 if not authenticated", async () => {
      const ad = await createDraftEscrowAd(ownerId);
      const req = buildRequest(`/api/payments/ads/${ad.id}/escrow`, {
        method: "POST",
        body: { method: "kaspi" },
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: ad.id }) });
      expect(res.status).toBe(401);
      await prisma.ad.delete({ where: { id: ad.id } });
    });

    it("returns 400 if method is missing", async () => {
      const ad = await createDraftEscrowAd(ownerId);
      const req = buildRequest(`/api/payments/ads/${ad.id}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: {},
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: ad.id }) });
      expect(res.status).toBe(400);
      await prisma.ad.delete({ where: { id: ad.id } });
    });

    it("returns 400 if method is invalid", async () => {
      const ad = await createDraftEscrowAd(ownerId);
      const req = buildRequest(`/api/payments/ads/${ad.id}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: { method: "bitcoin" },
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: ad.id }) });
      expect(res.status).toBe(400);
      await prisma.ad.delete({ where: { id: ad.id } });
    });

    it("returns 400 if requester does not own the ad", async () => {
      const ad = await createDraftEscrowAd(ownerId);
      const req = buildRequest(`/api/payments/ads/${ad.id}/escrow`, {
        method: "POST",
        token: otherToken,
        body: { method: "kaspi" },
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: ad.id }) });
      expect(res.status).toBe(400);
      await prisma.ad.delete({ where: { id: ad.id } });
    });

    it("returns 400 if ad is not in escrow mode", async () => {
      const directAd = await prisma.ad.create({
        data: {
          ownerId,
          title: "Direct Ad",
          description: "Not escrow",
          platform: "TikTok",
          city: "Almaty",
          category: "Memy",
          status: "draft",
          budgetType: "per_views",
          paymentMode: "direct",
        },
      });
      const req = buildRequest(`/api/payments/ads/${directAd.id}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: { method: "kaspi" },
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: directAd.id }) });
      expect(res.status).toBe(400);
      await prisma.ad.delete({ where: { id: directAd.id } });
    });
  });

  describe("Payment session creation", () => {
    let adId: string;
    let sessionId: string;

    afterAll(async () => {
      if (adId) await cleanupEscrowAd(adId);
    });

    it("creates PaymentSession with escrow_deposit type", async () => {
      const ad = await createDraftEscrowAd(ownerId, 30_000);
      adId = ad.id;

      const req = buildRequest(`/api/payments/ads/${adId}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: { method: "kaspi" },
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: adId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.sessionId).toBeDefined();
      expect(body.paymentUrl).toContain("mock");
      sessionId = body.sessionId;

      // Verify DB session
      const session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
      expect(session).not.toBeNull();
      expect(session!.type).toBe("escrow_deposit");
      expect(session!.amount).toBe(30_000);
      expect(session!.method).toBe("kaspi");
      expect(session!.status).toBe("pending");
      expect(session!.adId).toBe(adId);
    });

    it("webhook creates EscrowAccount and activates ad", async () => {
      const beforeWebhook = Date.now();

      const webhookReq = buildRequest("/api/payments/webhook", {
        method: "POST",
        body: {
          orderId: sessionId,
          externalId: `mock_escrow_${Date.now()}`,
          status: "success",
          amount: "30000",
        },
      });
      const webhookRes = await webhook(webhookReq);
      expect(webhookRes.status).toBe(200);

      // Verify ad is now active
      const ad = await prisma.ad.findUnique({ where: { id: adId } });
      expect(ad!.status).toBe("active");
      expect(ad!.publishedAt).toBeInstanceOf(Date);
      expect(ad!.expiresAt).toBeNull(); // escrow ads have no expiresAt

      // Verify EscrowAccount created
      const escrow = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrow).not.toBeNull();
      expect(escrow!.initialAmount).toBe(30_000);
      expect(escrow!.available).toBe(30_000);
      expect(escrow!.spentAmount).toBe(0);
      expect(escrow!.reservedAmount).toBe(0);
      expect(escrow!.status).toBe("active");

      // publishedAt within reasonable range
      const diff = ad!.publishedAt!.getTime() - beforeWebhook;
      expect(diff).toBeGreaterThanOrEqual(-1000);
      expect(diff).toBeLessThan(30_000);
    });

    it("PaymentSession status becomes success after webhook", async () => {
      const session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
      expect(session!.status).toBe("success");
    });

    it("webhook is idempotent for escrow_deposit", async () => {
      // Second identical webhook call — must not duplicate escrow or change state
      const webhookReq = buildRequest("/api/payments/webhook", {
        method: "POST",
        body: {
          orderId: sessionId,
          externalId: `mock_escrow_duplicate`,
          status: "success",
          amount: "30000",
        },
      });
      const webhookRes = await webhook(webhookReq);
      expect(webhookRes.status).toBe(200);

      // Escrow should still be same
      const escrow = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrow!.initialAmount).toBe(30_000);
      expect(escrow!.available).toBe(30_000);
    });
  });

  describe("Escrow topup", () => {
    let adId: string;
    let firstSessionId: string;

    afterAll(async () => {
      if (adId) await cleanupEscrowAd(adId);
    });

    it("topup increases available and initialAmount", async () => {
      // Setup: create and fund initial escrow
      const ad = await createDraftEscrowAd(ownerId, 10_000);
      adId = ad.id;

      const req1 = buildRequest(`/api/payments/ads/${adId}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: { method: "kaspi" },
      });
      const res1 = await escrowPay(req1, { params: Promise.resolve({ id: adId }) });
      firstSessionId = (await res1.json()).sessionId;

      // Fund via webhook
      await webhook(buildRequest("/api/payments/webhook", {
        method: "POST",
        body: { orderId: firstSessionId, externalId: "mock_topup_base", status: "success", amount: "10000" },
      }));

      // Update ad totalBudget for topup
      await prisma.ad.update({ where: { id: adId }, data: { totalBudget: 5_000 } });

      // Topup payment
      const req2 = buildRequest(`/api/payments/ads/${adId}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: { method: "kaspi" },
      });
      const res2 = await escrowPay(req2, { params: Promise.resolve({ id: adId }) });
      expect(res2.status).toBe(200);
      const topupSessionId = (await res2.json()).sessionId;

      // Verify topup session type
      const topupSession = await prisma.paymentSession.findUnique({ where: { id: topupSessionId } });
      expect(topupSession!.type).toBe("escrow_topup");

      // Webhook for topup
      await webhook(buildRequest("/api/payments/webhook", {
        method: "POST",
        body: { orderId: topupSessionId, externalId: "mock_topup_2", status: "success", amount: "5000" },
      }));

      const escrow = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrow!.initialAmount).toBe(15_000); // 10k + 5k
      expect(escrow!.available).toBe(15_000);
    });

    it("topup reactivates budget_exhausted ad", async () => {
      // Mark ad as budget_exhausted
      await prisma.ad.update({ where: { id: adId }, data: { status: "budget_exhausted", totalBudget: 2_000 } });
      await prisma.escrowAccount.update({ where: { adId }, data: { status: "exhausted" } });

      const req = buildRequest(`/api/payments/ads/${adId}/escrow`, {
        method: "POST",
        token: ownerToken,
        body: { method: "kaspi" },
      });
      const res = await escrowPay(req, { params: Promise.resolve({ id: adId }) });
      const topupSessionId = (await res.json()).sessionId;

      await webhook(buildRequest("/api/payments/webhook", {
        method: "POST",
        body: { orderId: topupSessionId, externalId: "mock_reactivate", status: "success", amount: "2000" },
      }));

      const ad = await prisma.ad.findUnique({ where: { id: adId } });
      expect(ad!.status).toBe("active");

      const escrow = await prisma.escrowAccount.findUnique({ where: { adId } });
      expect(escrow!.status).toBe("active");
    });
  });
});
