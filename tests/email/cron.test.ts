/**
 * Email: Cron scenarios — 24h expiring, budget exhausted, SLA escalation.
 *
 * Крутим /api/cron/expire напрямую; состояние подготавливаем в БД так,
 * чтобы каждый конкретный email-путь сработал ровно один раз.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  buildRequest,
  createTestUser,
  trackUser,
  cleanup,
  createEscrowAd,
  createApplication,
  createSubmission,
  cleanupEscrowAd,
} from "../helpers";
import { mailbox } from "./_mailbox";

vi.mock("@/lib/email", async () => {
  const m = await import("./_mailbox");
  return m.emailModuleMock;
});

async function cronRoute() {
  return (await import("@/app/api/cron/expire/route")).GET;
}

const CRON_SECRET = "test-cron-secret";
const createdAdIds: string[] = [];

beforeAll(() => {
  process.env.CRON_SECRET = CRON_SECRET;
});

afterAll(async () => {
  for (const id of createdAdIds) await cleanupEscrowAd(id);
  await cleanup();
});

function cronReq(): ReturnType<typeof buildRequest> {
  return buildRequest(`/api/cron/expire?secret=${CRON_SECRET}`);
}

describe("Email · Cron", () => {
  it("expiring 24h → sendAdExpiringEmail + флаг expiryReminderSentAt", async () => {
    const GET = await cronRoute();
    const { user } = await createTestUser({ name: "Expiring Ad Owner" });
    trackUser(user.id);

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

    // expiresAt через 24ч (в окне [23ч, 25ч])
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const ad = await prisma.ad.create({
      data: {
        ownerId: user.id,
        title: "Expiring Ad",
        description: "Истекает через 24ч",
        platform: "TikTok",
        cityId: city.id,
        categoryId: category.id,
        status: "active",
        expiresAt,
        budgetType: "fixed",
      },
    });
    createdAdIds.push(ad.id);
    mailbox.clear();

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expiryRemindersSent).toBeGreaterThanOrEqual(1);

    const mail = mailbox.last("sendAdExpiringEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);
    expect(mail!.args[1]).toMatchObject({ adId: ad.id, adTitle: "Expiring Ad" });

    // Идемпотентность: повторный вызов — нет повторного письма.
    const before = mailbox.count("sendAdExpiringEmail");
    await GET(cronReq());
    expect(mailbox.count("sendAdExpiringEmail")).toBe(before);

    const fresh = await prisma.ad.findUnique({ where: { id: ad.id } });
    expect(fresh!.expiryReminderSentAt).not.toBeNull();
  });

  it("budget_exhausted → sendBudgetExhaustedEmail + ad.status=budget_exhausted", async () => {
    const GET = await cronRoute();
    const { user } = await createTestUser({ name: "Exhaust Ad Owner" });
    trackUser(user.id);

    const { ad, escrow } = await createEscrowAd(user.id, { totalBudget: 1_000 });
    createdAdIds.push(ad.id);

    // Доведём эскроу до 0 (available=0, reserved=0)
    await prisma.escrowAccount.update({
      where: { id: escrow.id },
      data: { available: 0, spentAmount: 1_000, reservedAmount: 0 },
    });
    mailbox.clear();

    const res = await GET(cronReq());
    expect(res.status).toBe(200);

    const mail = mailbox.last("sendBudgetExhaustedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);
    expect(mail!.args[1]).toMatchObject({ adId: ad.id });

    const freshAd = await prisma.ad.findUnique({ where: { id: ad.id } });
    expect(freshAd!.status).toBe("budget_exhausted");
    const freshEscrow = await prisma.escrowAccount.findUnique({ where: { id: escrow.id } });
    expect(freshEscrow!.status).toBe("exhausted");
  });

  it("SLA escalated → sendAdminSlaEscalationEmail со списком", async () => {
    const GET = await cronRoute();
    process.env.ADMIN_EMAIL = "admin@test.local";

    const { user: advertiser } = await createTestUser({ name: "SLA Advertiser" });
    trackUser(advertiser.id);
    const { user: creator } = await createTestUser({ name: "SLA Creator" });
    trackUser(creator.id);

    const { ad } = await createEscrowAd(advertiser.id, { totalBudget: 10_000 });
    createdAdIds.push(ad.id);
    const app = await createApplication(ad.id, creator.id);
    const submission = await createSubmission(app, creator.id, { claimedViews: 10_000 });

    // Просрочиваем SLA
    await prisma.videoSubmission.update({
      where: { id: submission.id },
      data: { slaDeadline: new Date(Date.now() - 60 * 60 * 1000), escalated: false },
    });
    mailbox.clear();

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escalatedSubmissions).toBeGreaterThanOrEqual(1);

    const mail = mailbox.last("sendAdminSlaEscalationEmail");
    expect(mail).toBeDefined();
    // Admin-функции не принимают `to` первым аргументом — адрес читают
    // из ADMIN_EMAIL внутри lib/email.ts. Проверяем payload.
    const payload = mail!.args[0] as {
      escalatedCount: number;
      items: Array<{ submissionId: string; taskTitle: string; creatorEmail: string }>;
    };
    expect(payload.escalatedCount).toBeGreaterThanOrEqual(1);
    expect(payload.items.find((i) => i.submissionId === submission.id)).toBeDefined();

    // После escalated=true — второй тик письмо не повторяет
    const before = mailbox.count("sendAdminSlaEscalationEmail");
    await GET(cronReq());
    expect(mailbox.count("sendAdminSlaEscalationEmail")).toBe(before);
  });
});
