/**
 * Email: Payment receipts — 7 сценариев.
 *
 * Триггер — `applyPaymentWebhook` после успешной оплаты. Для каждого типа
 * создаём pending PaymentSession, гоняем webhook, проверяем что улетел
 * sendPaymentReceiptEmail с корректным type/amount/entity.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  trackUser,
  cleanup,
  createEscrowAd,
  cleanupEscrowAd,
} from "../helpers";
import { mailbox } from "./_mailbox";
import { createPendingSession, createCreatorProfile, tick } from "./_helpers";

vi.mock("@/lib/email", async () => {
  const m = await import("./_mailbox");
  return m.emailModuleMock;
});

async function webhook() {
  return (await import("@/lib/payment-webhook-handler")).applyPaymentWebhook;
}

let userId: string;
let userEmail: string;
const createdAdIds: string[] = [];
const createdProfileIds: string[] = [];

beforeAll(async () => {
  const u = await createTestUser({ name: "Receipt User" });
  trackUser(u.user.id);
  userId = u.user.id;
  userEmail = u.user.email!;
});

afterAll(async () => {
  for (const id of createdAdIds) await cleanupEscrowAd(id);
  for (const id of createdProfileIds) {
    await prisma.creatorProfile.deleteMany({ where: { id } });
  }
  await cleanup();
});

async function minimalAd() {
  const city = await prisma.city.upsert({
    where: { key: "Almaty" },
    update: {},
    create: { key: "Almaty", label: "Алматы" },
  });
  const category = await prisma.category.upsert({
    where: { key: "Obzory" },
    update: {},
    create: { key: "Obzory", label: "Обзоры" },
  });
  const ad = await prisma.ad.create({
    data: {
      ownerId: userId,
      title: "Receipt Ad",
      description: "Ad for receipt test",
      platform: "TikTok",
      cityId: city.id,
      categoryId: category.id,
      status: "draft",
      budgetType: "fixed",
    },
  });
  createdAdIds.push(ad.id);
  return ad;
}

describe("Email · Payment receipts", () => {
  it("ad_publication → receipt с entityId ad", async () => {
    const apply = await webhook();
    const ad = await minimalAd();
    const session = await createPendingSession({
      userId,
      type: "ad_publication",
      amount: 990,
      adId: ad.id,
    });
    mailbox.clear();

    const res = await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_1" });
    expect(res.ok).toBe(true);

    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(userEmail);
    expect(mail!.args[1]).toMatchObject({
      type: "ad_publication",
      amount: 990,
      entityId: ad.id,
      entityTitle: "Receipt Ad",
    });
  });

  it("creator_publication → receipt с entityId profile", async () => {
    const apply = await webhook();
    const profile = await createCreatorProfile(userId, { title: "Receipt Profile" });
    createdProfileIds.push(profile.id);
    const session = await createPendingSession({
      userId,
      type: "creator_publication",
      amount: 0,
      creatorProfileId: profile.id,
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_2" });
    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail).toBeDefined();
    expect(mail!.args[1]).toMatchObject({
      type: "creator_publication",
      entityId: profile.id,
      entityTitle: "Receipt Profile",
    });
  });

  it("escrow_deposit → receipt + создан EscrowAccount", async () => {
    const apply = await webhook();
    const ad = await minimalAd();
    const session = await createPendingSession({
      userId,
      type: "escrow_deposit",
      amount: 50_000,
      adId: ad.id,
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_3" });

    const escrow = await prisma.escrowAccount.findUnique({ where: { adId: ad.id } });
    expect(escrow).not.toBeNull();
    expect(escrow!.available).toBe(50_000);

    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail!.args[1]).toMatchObject({ type: "escrow_deposit", amount: 50_000 });
  });

  it("escrow_topup → receipt + баланс увеличен", async () => {
    const apply = await webhook();
    const { ad, escrow } = await createEscrowAd(userId, { totalBudget: 10_000 });
    createdAdIds.push(ad.id);
    const session = await createPendingSession({
      userId,
      type: "escrow_topup",
      amount: 20_000,
      adId: ad.id,
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_4" });

    const updated = await prisma.escrowAccount.findUnique({ where: { id: escrow.id } });
    expect(updated!.available).toBe(30_000);

    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail!.args[1]).toMatchObject({ type: "escrow_topup", amount: 20_000 });
  });

  it("wallet_topup → receipt + creatorBalance пополнен", async () => {
    const apply = await webhook();
    const session = await createPendingSession({
      userId,
      type: "wallet_topup",
      amount: 5_000,
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_5" });

    const balance = await prisma.creatorBalance.findUnique({ where: { userId } });
    expect(balance).not.toBeNull();
    expect(balance!.balance).toBeGreaterThanOrEqual(5_000);

    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail!.args[1]).toMatchObject({ type: "wallet_topup", amount: 5_000 });
  });

  it("ad_boost → receipt c entityId=ad", async () => {
    const apply = await webhook();
    const ad = await minimalAd();
    const session = await createPendingSession({
      userId,
      type: "ad_boost",
      amount: 1990,
      adId: ad.id,
      boostType: "rise",
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_6" });

    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail!.args[1]).toMatchObject({ type: "ad_boost", amount: 1990, entityId: ad.id });
  });

  it("creator_boost → receipt c entityId=profile", async () => {
    const apply = await webhook();
    const profile = await createCreatorProfile(userId, { title: "Boosted Profile" });
    createdProfileIds.push(profile.id);
    const session = await createPendingSession({
      userId,
      type: "creator_boost",
      amount: 2990,
      creatorProfileId: profile.id,
      boostType: "vip",
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "success", amount: session.amount, rawData: {}, externalId: "ext_7" });

    const mail = await mailbox.waitFor("sendPaymentReceiptEmail");
    expect(mail!.args[1]).toMatchObject({
      type: "creator_boost",
      amount: 2990,
      entityId: profile.id,
    });
  });

  it("оплата не success → receipt НЕ отправлен", async () => {
    const apply = await webhook();
    const ad = await minimalAd();
    const session = await createPendingSession({
      userId,
      type: "ad_publication",
      amount: 990,
      adId: ad.id,
    });
    mailbox.clear();

    await apply({ orderId: session.id, status: "failed", amount: session.amount, rawData: {}, externalId: "ext_8" });
    await tick(80);
    expect(mailbox.count("sendPaymentReceiptEmail")).toBe(0);
  });
});
