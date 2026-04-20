/**
 * Email: Moderation — approve / reject / reject с permanent-reason / appeal-resolved.
 *
 * DB-фикстуры через createEscrowAd + createSubmission из общих helpers.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  buildRequest,
  createTestUser,
  createAdminUser,
  trackUser,
  cleanup,
  createEscrowAd,
  createApplication,
  createSubmission,
  cleanupEscrowAd,
  cleanupBalance,
} from "../helpers";
import { mailbox } from "./_mailbox";
import { markSubmissionRejected, createPendingAppeal } from "./_helpers";

vi.mock("@/lib/email", async () => {
  const m = await import("./_mailbox");
  return m.emailModuleMock;
});

async function routes() {
  return {
    approve: (await import("@/app/api/admin/submissions/[id]/approve/route")).POST,
    reject: (await import("@/app/api/admin/submissions/[id]/reject/route")).POST,
    resolveAppeal: (await import("@/app/api/admin/appeals/[id]/resolve/route")).POST,
  };
}

let adminToken: string;
let advertiserId: string;
let creatorId: string;
let creatorEmail: string;
const createdAdIds: string[] = [];

beforeAll(async () => {
  const admin = await createAdminUser({ name: "Mod Admin" });
  trackUser(admin.user.id);
  adminToken = admin.token;

  const adv = await createTestUser({ name: "Mod Advertiser" });
  trackUser(adv.user.id);
  advertiserId = adv.user.id;

  const cr = await createTestUser({ name: "Mod Creator" });
  trackUser(cr.user.id);
  creatorId = cr.user.id;
  creatorEmail = cr.user.email!;
});

afterAll(async () => {
  for (const id of createdAdIds) await cleanupEscrowAd(id);
  await cleanupBalance(creatorId);
  await cleanup();
});

describe("Email · Moderation", () => {
  it("approve → sendSubmissionApprovedEmail c approvedViews/payoutAmount", async () => {
    const { approve } = await routes();
    const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 50_000 });
    createdAdIds.push(ad.id);
    const app = await createApplication(ad.id, creatorId);
    const sub = await createSubmission(app, creatorId, { claimedViews: 10_000 });
    mailbox.clear();

    const res = await approve(
      buildRequest(`/api/admin/submissions/${sub.id}/approve`, {
        method: "POST",
        token: adminToken,
        body: { approvedViews: 10_000 },
      }),
      { params: Promise.resolve({ id: sub.id }) },
    );
    expect(res.status).toBe(200);

    const mail = await mailbox.waitFor("sendSubmissionApprovedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(creatorEmail);
    const payload = mail!.args[1] as { taskTitle: string; approvedViews: number; payoutAmount: number };
    expect(payload.approvedViews).toBe(10_000);
    expect(payload.payoutAmount).toBeGreaterThan(0);
  });

  it("reject (no_brand) → sendSubmissionRejectedEmail с canAppeal=true", async () => {
    const { reject } = await routes();
    const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 20_000 });
    createdAdIds.push(ad.id);
    const app = await createApplication(ad.id, creatorId);
    const sub = await createSubmission(app, creatorId, { claimedViews: 5_000 });
    mailbox.clear();

    const res = await reject(
      buildRequest(`/api/admin/submissions/${sub.id}/reject`, {
        method: "POST",
        token: adminToken,
        body: { reason: "no_brand" },
      }),
      { params: Promise.resolve({ id: sub.id }) },
    );
    expect(res.status).toBe(200);

    const mail = await mailbox.waitFor("sendSubmissionRejectedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(creatorEmail);
    expect(mail!.args[1]).toMatchObject({ canAppeal: true, submissionId: sub.id });
  });

  it("reject (fake_stats) → canAppeal=false (permanent reason)", async () => {
    const { reject } = await routes();
    const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 20_000 });
    createdAdIds.push(ad.id);
    const app = await createApplication(ad.id, creatorId);
    const sub = await createSubmission(app, creatorId, { claimedViews: 5_000 });
    mailbox.clear();

    await reject(
      buildRequest(`/api/admin/submissions/${sub.id}/reject`, {
        method: "POST",
        token: adminToken,
        body: { reason: "fake_stats" },
      }),
      { params: Promise.resolve({ id: sub.id }) },
    );

    const mail = await mailbox.waitFor("sendSubmissionRejectedEmail");
    expect(mail!.args[1]).toMatchObject({ canAppeal: false });
  });

  it("appeal resolve (approved) → sendAppealResolvedEmail + submission → submitted", async () => {
    const { resolveAppeal } = await routes();
    const { ad } = await createEscrowAd(advertiserId, { rpm: 100, totalBudget: 10_000 });
    createdAdIds.push(ad.id);
    const app = await createApplication(ad.id, creatorId);
    const sub = await createSubmission(app, creatorId, { claimedViews: 3_000, status: "rejected" });
    await markSubmissionRejected(sub.id);
    const appeal = await createPendingAppeal(sub.id, creatorId);
    mailbox.clear();

    const res = await resolveAppeal(
      buildRequest(`/api/admin/appeals/${appeal.id}/resolve`, {
        method: "POST",
        token: adminToken,
        body: { decision: "approved", comment: "Пересмотрели, всё ОК" },
      }),
      { params: Promise.resolve({ id: appeal.id }) },
    );
    expect(res.status).toBe(200);

    const mail = await mailbox.waitFor("sendAppealResolvedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(creatorEmail);
    expect(mail!.args[1]).toMatchObject({ decision: "approved", submissionId: sub.id });

    const freshSub = await prisma.videoSubmission.findUnique({ where: { id: sub.id } });
    expect(freshSub!.status).toBe("submitted");
  });
});
