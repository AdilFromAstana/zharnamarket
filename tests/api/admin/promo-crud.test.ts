import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createAdminUser,
  buildRequest,
  trackUser,
  cleanup,
} from "../../helpers";

import { GET as listPromos, POST as createPromo } from "@/app/api/admin/promo/route";
import { GET as getPromoDetail, PATCH as patchPromo } from "@/app/api/admin/promo/[id]/route";

// ─── Shared state ───────────────────────────────────────────────────────────
let adminToken: string;
let adminUserId: string;
const createdPromoIds: string[] = [];

// Unique code prefix for this run
const PREFIX = `T${Date.now().toString(36).toUpperCase()}`;
let codeCounter = 0;
function uniqueCode(): string {
  return `${PREFIX}${++codeCounter}`;
}

afterAll(async () => {
  // Delete promo codes created in tests
  if (createdPromoIds.length > 0) {
    await prisma.promoCodeUsage.deleteMany({
      where: { promoCodeId: { in: createdPromoIds } },
    });
    await prisma.promoCode.deleteMany({
      where: { id: { in: createdPromoIds } },
    });
  }
  await cleanup();
});

describe("Admin Promo CRUD", () => {
  // ─── Setup ──────────────────────────────────────────────────────────────

  it("setup: create admin user", async () => {
    const admin = await createAdminUser();
    trackUser(admin.user.id);
    adminToken = admin.token;
    adminUserId = admin.user.id;
  });

  // ─── CREATE (POST /api/admin/promo) ─────────────────────────────────────

  describe("POST /api/admin/promo — create promo code", () => {
    it("returns 400 if code is missing", async () => {
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { discountType: "percent", discountValue: 10, applicableTo: ["ad_publication"] },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if discountType is invalid", async () => {
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code: uniqueCode(), discountType: "bogus", discountValue: 10, applicableTo: ["ad_publication"] },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if discountValue is 0 or negative", async () => {
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code: uniqueCode(), discountType: "percent", discountValue: 0, applicableTo: ["ad_publication"] },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if percent > 100", async () => {
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code: uniqueCode(), discountType: "percent", discountValue: 150, applicableTo: ["ad_publication"] },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if applicableTo is empty", async () => {
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code: uniqueCode(), discountType: "percent", discountValue: 10, applicableTo: [] },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 if applicableTo contains invalid type", async () => {
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code: uniqueCode(), discountType: "percent", discountValue: 10, applicableTo: ["invalid_type"] },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(400);
    });

    it("creates promo code with 201 — percent discount", async () => {
      const code = uniqueCode();
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: {
          code,
          discountType: "percent",
          discountValue: 25,
          maxUses: 100,
          expiresAt: "2030-12-31T00:00:00Z",
          applicableTo: ["ad_publication", "ad_boost"],
        },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      createdPromoIds.push(body.id);
      expect(body.code).toBe(code.toUpperCase());
      expect(body.discountType).toBe("percent");
      expect(body.discountValue).toBe(25);
      expect(body.maxUses).toBe(100);
      expect(body.isActive).toBe(true);
      expect(body.applicableTo).toEqual(expect.arrayContaining(["ad_publication", "ad_boost"]));
    });

    it("creates promo code with 201 — fixed_amount discount", async () => {
      const code = uniqueCode();
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: {
          code,
          discountType: "fixed_amount",
          discountValue: 500,
          applicableTo: ["creator_publication"],
        },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      createdPromoIds.push(body.id);
      expect(body.code).toBe(code.toUpperCase());
      expect(body.discountType).toBe("fixed_amount");
      expect(body.discountValue).toBe(500);
      expect(body.maxUses).toBeNull();
      expect(body.expiresAt).toBeNull();
    });

    it("code is stored uppercased", async () => {
      const code = `lower${uniqueCode()}`;
      const req = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: {
          code,
          discountType: "percent",
          discountValue: 5,
          applicableTo: ["ad_publication"],
        },
      });
      const res = await createPromo(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      createdPromoIds.push(body.id);
      expect(body.code).toBe(code.toUpperCase());
    });

    it("returns 400 for duplicate code (case-insensitive)", async () => {
      const code = uniqueCode();
      // Create first
      const req1 = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code, discountType: "percent", discountValue: 10, applicableTo: ["ad_publication"] },
      });
      const res1 = await createPromo(req1);
      expect(res1.status).toBe(201);
      const body1 = await res1.json();
      createdPromoIds.push(body1.id);

      // Attempt duplicate
      const req2 = buildRequest("/api/admin/promo", {
        method: "POST",
        token: adminToken,
        body: { code: code.toLowerCase(), discountType: "percent", discountValue: 10, applicableTo: ["ad_publication"] },
      });
      const res2 = await createPromo(req2);
      expect(res2.status).toBe(400);
    });
  });

  // ─── LIST (GET /api/admin/promo) ────────────────────────────────────────

  describe("GET /api/admin/promo — list promo codes", () => {
    it("returns array in data field", async () => {
      const req = buildRequest("/api/admin/promo", { token: adminToken });
      const res = await listPromos(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("each promo has _count.usages field", async () => {
      const req = buildRequest("/api/admin/promo", { token: adminToken });
      const res = await listPromos(req);
      const body = await res.json();

      if (body.data.length > 0) {
        const first = body.data[0];
        expect(first._count).toBeDefined();
        expect(typeof first._count.usages).toBe("number");
      }
    });

    it("list includes recently created promo codes", async () => {
      const req = buildRequest("/api/admin/promo", { token: adminToken });
      const res = await listPromos(req);
      const body = await res.json();

      const codes = body.data.map((p: { code: string }) => p.code);
      // At least one of our created promos should be in the list
      const foundOurs = createdPromoIds.length > 0 &&
        body.data.some((p: { id: string }) => createdPromoIds.includes(p.id));
      expect(foundOurs).toBe(true);
    });
  });

  // ─── GET DETAIL (GET /api/admin/promo/[id]) ─────────────────────────────

  describe("GET /api/admin/promo/[id] — promo detail", () => {
    it("returns 404 for non-existent id", async () => {
      const req = buildRequest("/api/admin/promo/nonexistent-id", { token: adminToken });
      const res = await getPromoDetail(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("returns promo details with usages array", async () => {
      // Use the first promo created above
      const promoId = createdPromoIds[0];
      expect(promoId).toBeDefined();

      const req = buildRequest(`/api/admin/promo/${promoId}`, { token: adminToken });
      const res = await getPromoDetail(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.id).toBe(promoId);
      expect(body.usages).toBeDefined();
      expect(Array.isArray(body.usages)).toBe(true);
    });
  });

  // ─── UPDATE (PATCH /api/admin/promo/[id]) ───────────────────────────────

  describe("PATCH /api/admin/promo/[id] — update promo", () => {
    it("returns 404 for non-existent id", async () => {
      const req = buildRequest("/api/admin/promo/nonexistent-id", {
        method: "PATCH",
        token: adminToken,
        body: { isActive: false },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("returns 400 if no fields to update", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: {},
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(400);
    });

    it("deactivates a promo code", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: { isActive: false },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isActive).toBe(false);
    });

    it("re-activates a promo code", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: { isActive: true },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isActive).toBe(true);
    });

    it("updates maxUses", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: { maxUses: 50 },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.maxUses).toBe(50);
    });

    it("updates discountValue", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: { discountValue: 30 },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.discountValue).toBe(30);
    });

    it("returns 400 for invalid discountType", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: { discountType: "bogus" },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 for discountValue <= 0", async () => {
      const promoId = createdPromoIds[0];
      const req = buildRequest(`/api/admin/promo/${promoId}`, {
        method: "PATCH",
        token: adminToken,
        body: { discountValue: -5 },
      });
      const res = await patchPromo(req, { params: Promise.resolve({ id: promoId }) });
      expect(res.status).toBe(400);
    });
  });
});
