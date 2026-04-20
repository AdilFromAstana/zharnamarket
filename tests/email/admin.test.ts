/**
 * Email: Admin alerts — withdrawal / report / appeal-submitted.
 * Также сюда положен task-application (owner notify).
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
  cleanupBalance,
} from "../helpers";
import { mailbox } from "./_mailbox";
import { markSubmissionRejected } from "./_helpers";

vi.mock("@/lib/email", async () => {
  const m = await import("./_mailbox");
  return m.emailModuleMock;
});

async function routes() {
  return {
    withdraw: (await import("@/app/api/balance/withdraw/route")).POST,
    reports: (await import("@/app/api/reports/route")).POST,
    appealSubmit: (await import("@/app/api/submissions/[id]/appeal/route")).POST,
    taskApply: (await import("@/app/api/tasks/[id]/apply/route")).POST,
  };
}

let userId: string;
let userToken: string;
let userEmail: string;
let advertiserId: string;
let advertiserEmail: string;
const createdAdIds: string[] = [];

beforeAll(async () => {
  process.env.ADMIN_EMAIL = "admin@test.local";
  const u = await createTestUser({ name: "Admin Alerts User" });
  trackUser(u.user.id);
  userId = u.user.id;
  userToken = u.token;
  userEmail = u.user.email!;

  const adv = await createTestUser({ name: "Application Owner" });
  trackUser(adv.user.id);
  advertiserId = adv.user.id;
  advertiserEmail = adv.user.email!;
});

afterAll(async () => {
  for (const id of createdAdIds) await cleanupEscrowAd(id);
  await cleanupBalance(userId);
  await cleanup();
});

describe("Email · Admin alerts", () => {
  it("withdraw → sendAdminWithdrawalRequestEmail с суммой и requestId", async () => {
    const { withdraw } = await routes();

    // Засеем баланс
    await prisma.creatorBalance.upsert({
      where: { userId },
      create: { userId, balance: 5_000, totalEarned: 5_000 },
      update: { balance: 5_000, totalEarned: 5_000 },
    });
    mailbox.clear();

    const res = await withdraw(
      buildRequest("/api/balance/withdraw", {
        method: "POST",
        token: userToken,
        body: { amount: 2_000, method: "card", details: "4400 1234 5678 9012" },
      }),
    );
    expect(res.status).toBe(201);

    const mail = await mailbox.waitFor("sendAdminWithdrawalRequestEmail");
    expect(mail).toBeDefined();
    const payload = mail!.args[0] as {
      userEmail: string; amount: number; method: string; requestId: string;
    };
    expect(payload.userEmail).toBe(userEmail);
    expect(payload.amount).toBe(2_000);
    expect(payload.method).toBe("card");
    expect(payload.requestId).toBeTruthy();
  });

  it("report → sendAdminReportEmail с targetType/targetId/reason", async () => {
    const { reports } = await routes();
    mailbox.clear();

    const res = await reports(
      buildRequest("/api/reports", {
        method: "POST",
        token: userToken,
        body: {
          targetType: "ad",
          targetId: "fake_ad_id",
          reason: "spam",
          description: "Спам реклама",
        },
      }),
    );
    expect(res.status).toBe(201);

    const mail = await mailbox.waitFor("sendAdminReportEmail");
    expect(mail).toBeDefined();
    const payload = mail!.args[0] as {
      userEmail: string; reportId: string; targetType: string; targetId: string; reason: string;
    };
    expect(payload.userEmail).toBe(userEmail);
    expect(payload.targetType).toBe("ad");
    expect(payload.targetId).toBe("fake_ad_id");
    expect(payload.reason).toContain("spam");
  });

  it("appeal submit → sendAdminAppealEmail с причиной", async () => {
    const { appealSubmit } = await routes();
    const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 10_000 });
    createdAdIds.push(ad.id);
    const app = await createApplication(ad.id, userId);
    const sub = await createSubmission(app, userId, { claimedViews: 3_000, status: "rejected" });
    await markSubmissionRejected(sub.id, "no_brand");
    mailbox.clear();

    const res = await appealSubmit(
      buildRequest(`/api/submissions/${sub.id}/appeal`, {
        method: "POST",
        token: userToken,
        body: { reason: "Не согласен, бренд виден на 0:05" },
      }),
      { params: Promise.resolve({ id: sub.id }) },
    );
    expect(res.status).toBe(201);

    const mail = await mailbox.waitFor("sendAdminAppealEmail");
    expect(mail).toBeDefined();
    const payload = mail!.args[0] as {
      userEmail: string; submissionId: string; appealId: string; reason: string;
    };
    expect(payload.userEmail).toBe(userEmail);
    expect(payload.submissionId).toBe(sub.id);
    expect(payload.reason).toContain("бренд");
  });

  it("task apply → sendApplicationEmail владельцу задания", async () => {
    const { taskApply } = await routes();
    const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 10_000 });
    createdAdIds.push(ad.id);
    mailbox.clear();

    const res = await taskApply(
      buildRequest(`/api/tasks/${ad.id}/apply`, {
        method: "POST",
        token: userToken,
      }),
      { params: Promise.resolve({ id: ad.id }) },
    );
    expect([200, 201]).toContain(res.status);

    const mail = await mailbox.waitFor("sendApplicationEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(advertiserEmail);
    expect(mail!.args[1]).toMatchObject({ taskId: ad.id });
  });
});
