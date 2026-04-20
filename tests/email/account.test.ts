/**
 * Email: Account block / unblock via admin PATCH /api/admin/users/[id].
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildRequest, createAdminUser, createTestUser, trackUser, cleanup } from "../helpers";
import { mailbox } from "./_mailbox";

vi.mock("@/lib/email", async () => {
  const m = await import("./_mailbox");
  return m.emailModuleMock;
});

async function adminUserRoute() {
  return (await import("@/app/api/admin/users/[id]/route")).PATCH;
}

let adminToken: string;

beforeAll(async () => {
  const a = await createAdminUser({ name: "Block Admin" });
  trackUser(a.user.id);
  adminToken = a.token;
});

afterAll(async () => {
  await cleanup();
});

describe("Email · Account", () => {
  it("block=true → sendAccountBlockedEmail + user.blocked=true", async () => {
    const PATCH = await adminUserRoute();
    const { user } = await createTestUser({ name: "To Be Blocked" });
    trackUser(user.id);
    mailbox.clear();

    const res = await PATCH(
      buildRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        token: adminToken,
        body: { blocked: true },
      }),
      { params: Promise.resolve({ id: user.id }) },
    );
    expect(res.status).toBe(200);

    const mail = await mailbox.waitFor("sendAccountBlockedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh!.blocked).toBe(true);
  });

  it("block=false (разблок) → sendAccountUnblockedEmail", async () => {
    const PATCH = await adminUserRoute();
    const { user } = await createTestUser({ name: "To Be Unblocked" });
    trackUser(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { blocked: true, blockedAt: new Date() } });
    mailbox.clear();

    const res = await PATCH(
      buildRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        token: adminToken,
        body: { blocked: false },
      }),
      { params: Promise.resolve({ id: user.id }) },
    );
    expect(res.status).toBe(200);

    const mail = await mailbox.waitFor("sendAccountUnblockedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh!.blocked).toBe(false);
  });

  it("block без изменения (уже заблокирован) → письмо НЕ отправляется повторно", async () => {
    const PATCH = await adminUserRoute();
    const { user } = await createTestUser({ name: "Already Blocked" });
    trackUser(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { blocked: true, blockedAt: new Date() } });
    mailbox.clear();

    await PATCH(
      buildRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        token: adminToken,
        body: { blocked: true },
      }),
      { params: Promise.resolve({ id: user.id }) },
    );
    await new Promise((r) => setTimeout(r, 80));
    expect(mailbox.count("sendAccountBlockedEmail")).toBe(0);
  });
});
