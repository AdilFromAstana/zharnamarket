import { describe, it, expect, afterAll } from "vitest";
import { NextResponse } from "next/server";
import {
  createTestUser,
  createAdminUser,
  buildRequest,
  trackUser,
  cleanup,
} from "../../helpers";

// Import route handlers
import { GET as getPromoList, POST as createPromo } from "@/app/api/admin/promo/route";
import { GET as getPromoDetail, PATCH as patchPromo } from "@/app/api/admin/promo/[id]/route";
import { GET as getStats } from "@/app/api/admin/stats/route";

// ─── Shared state ───────────────────────────────────────────────────────────
let userToken: string;
let adminToken: string;

// ─── Setup & teardown ───────────────────────────────────────────────────────

afterAll(async () => {
  await cleanup();
});

describe("Admin authorization — all admin endpoints require admin role", () => {
  // Create users once for the entire describe block
  it("setup: create test users", async () => {
    const regular = await createTestUser();
    trackUser(regular.user.id);
    userToken = regular.token;

    const admin = await createAdminUser();
    trackUser(admin.user.id);
    adminToken = admin.token;
  });

  // ─── No token (401) ─────────────────────────────────────────────────────

  it("GET /api/admin/promo — 401 without token", async () => {
    const req = buildRequest("/api/admin/promo");
    const res = await getPromoList(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/promo — 401 without token", async () => {
    const req = buildRequest("/api/admin/promo", { method: "POST", body: {} });
    const res = await createPromo(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/promo/[id] — 401 without token", async () => {
    const req = buildRequest("/api/admin/promo/fake-id");
    const res = await getPromoDetail(req, { params: Promise.resolve({ id: "fake-id" }) });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/promo/[id] — 401 without token", async () => {
    const req = buildRequest("/api/admin/promo/fake-id", { method: "PATCH", body: { isActive: false } });
    const res = await patchPromo(req, { params: Promise.resolve({ id: "fake-id" }) });
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/stats — 401 without token", async () => {
    const req = buildRequest("/api/admin/stats");
    const res = await getStats(req);
    expect(res.status).toBe(401);
  });

  // ─── Regular user token (403) ───────────────────────────────────────────

  it("GET /api/admin/promo — 403 with regular user token", async () => {
    const req = buildRequest("/api/admin/promo", { token: userToken });
    const res = await getPromoList(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/promo — 403 with regular user token", async () => {
    const req = buildRequest("/api/admin/promo", { method: "POST", body: {}, token: userToken });
    const res = await createPromo(req);
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/promo/[id] — 403 with regular user token", async () => {
    const req = buildRequest("/api/admin/promo/fake-id", { token: userToken });
    const res = await getPromoDetail(req, { params: Promise.resolve({ id: "fake-id" }) });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/promo/[id] — 403 with regular user token", async () => {
    const req = buildRequest("/api/admin/promo/fake-id", {
      method: "PATCH",
      body: { isActive: false },
      token: userToken,
    });
    const res = await patchPromo(req, { params: Promise.resolve({ id: "fake-id" }) });
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/stats — 403 with regular user token", async () => {
    const req = buildRequest("/api/admin/stats", { token: userToken });
    const res = await getStats(req);
    expect(res.status).toBe(403);
  });

  // ─── Admin token succeeds (2xx) ─────────────────────────────────────────

  it("GET /api/admin/promo — 200 with admin token", async () => {
    const req = buildRequest("/api/admin/promo", { token: adminToken });
    const res = await getPromoList(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/admin/stats — 200 with admin token", async () => {
    const req = buildRequest("/api/admin/stats", { token: adminToken });
    const res = await getStats(req);
    expect(res.status).toBe(200);
  });
});
