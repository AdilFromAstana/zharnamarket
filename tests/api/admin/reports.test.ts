/**
 * Integration tests — GET /api/admin/reports + PATCH /api/admin/reports/[id]
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  createAdminUser,
  buildRequest,
  trackUser,
  cleanup,
} from "../../helpers";

import { GET as listReports } from "@/app/api/admin/reports/route";
import { PATCH as patchReport } from "@/app/api/admin/reports/[id]/route";

// ─── Shared state ───────────────────────────────────────────────────────────

let adminToken: string;
let userToken: string;
let userId: string;
const reportIds: string[] = [];

beforeAll(async () => {
  const admin = await createAdminUser({ name: "Reports Admin" });
  trackUser(admin.user.id);
  adminToken = admin.token;

  const user = await createTestUser({ name: "Reports User" });
  trackUser(user.user.id);
  userToken = user.token;
  userId = user.user.id;

  // Create test reports
  const r1 = await prisma.report.create({
    data: {
      submitterId: userId,
      targetType: "ad",
      targetId: "fake-ad-1",
      reason: "spam: This is spam content",
      resolved: false,
    },
  });
  const r2 = await prisma.report.create({
    data: {
      submitterId: userId,
      targetType: "creator",
      targetId: "fake-creator-1",
      reason: "fake: Fake profile",
      resolved: true,
    },
  });
  const r3 = await prisma.report.create({
    data: {
      submitterId: userId,
      targetType: "ad",
      targetId: "fake-ad-2",
      reason: "scam: Scam listing",
      resolved: false,
    },
  });
  reportIds.push(r1.id, r2.id, r3.id);
});

afterAll(async () => {
  if (reportIds.length > 0) {
    await prisma.report.deleteMany({ where: { id: { in: reportIds } } });
  }
  await cleanup();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/admin/reports", () => {
  it("returns 401 without token", async () => {
    const req = buildRequest("/api/admin/reports");
    const res = await listReports(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 with regular user token", async () => {
    const req = buildRequest("/api/admin/reports", { token: userToken });
    const res = await listReports(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 with reports list and pagination", async () => {
    const req = buildRequest("/api/admin/reports", { token: adminToken });
    const res = await listReports(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(body.unresolvedCount).toBeGreaterThanOrEqual(2);

    // Each report has submitter info
    const report = body.data[0];
    expect(report.submitter).toBeDefined();
    expect(report.submitter.name).toBeDefined();
    expect(report.submitter.email).toBeDefined();
  });

  it("filters by resolved=false", async () => {
    const req = buildRequest("/api/admin/reports?resolved=false", { token: adminToken });
    const res = await listReports(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    const allUnresolved = body.data.every((r: { resolved: boolean }) => !r.resolved);
    expect(allUnresolved).toBe(true);
  });

  it("filters by targetType=creator", async () => {
    const req = buildRequest("/api/admin/reports?targetType=creator", { token: adminToken });
    const res = await listReports(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    const allCreator = body.data.every((r: { targetType: string }) => r.targetType === "creator");
    expect(allCreator).toBe(true);
  });
});

describe("PATCH /api/admin/reports/[id]", () => {
  it("returns 404 for non-existent report", async () => {
    const req = buildRequest("/api/admin/reports/nonexistent-id", {
      method: "PATCH",
      token: adminToken,
      body: { resolved: true },
    });
    const res = await patchReport(req, {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });

  it("resolves a report (resolved: true)", async () => {
    const unresolvedId = reportIds[0]; // first report is unresolved
    const req = buildRequest(`/api/admin/reports/${unresolvedId}`, {
      method: "PATCH",
      token: adminToken,
      body: { resolved: true },
    });
    const res = await patchReport(req, {
      params: Promise.resolve({ id: unresolvedId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.resolved).toBe(true);

    // Verify in DB
    const dbReport = await prisma.report.findUnique({ where: { id: unresolvedId } });
    expect(dbReport!.resolved).toBe(true);
  });

  it("unresolves a report (resolved: false)", async () => {
    const resolvedId = reportIds[1]; // second report is resolved
    const req = buildRequest(`/api/admin/reports/${resolvedId}`, {
      method: "PATCH",
      token: adminToken,
      body: { resolved: false },
    });
    const res = await patchReport(req, {
      params: Promise.resolve({ id: resolvedId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.resolved).toBe(false);
  });
});
