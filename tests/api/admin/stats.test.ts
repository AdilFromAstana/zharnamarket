import { describe, it, expect, afterAll } from "vitest";
import { createAdminUser, buildRequest, trackUser, cleanup } from "../../helpers";

import { GET as getStats } from "@/app/api/admin/stats/route";

let adminToken: string;

afterAll(async () => {
  await cleanup();
});

describe("GET /api/admin/stats", () => {
  it("setup: create admin user", async () => {
    const admin = await createAdminUser();
    trackUser(admin.user.id);
    adminToken = admin.token;
  });

  it("returns 200 with correct shape", async () => {
    const req = buildRequest("/api/admin/stats", { token: adminToken });
    const res = await getStats(req);
    expect(res.status).toBe(200);

    const body = await res.json();

    // All expected top-level keys must exist
    expect(body).toHaveProperty("totalUsers");
    expect(body).toHaveProperty("activeAds");
    expect(body).toHaveProperty("publishedCreators");
    expect(body).toHaveProperty("monthlyRevenue");
    expect(body).toHaveProperty("totalPromoCodes");
    expect(body).toHaveProperty("activePromoCodes");
    expect(body).toHaveProperty("recentPayments");
    expect(body).toHaveProperty("recentUsers");
  });

  it("numeric fields are numbers", async () => {
    const req = buildRequest("/api/admin/stats", { token: adminToken });
    const res = await getStats(req);
    const body = await res.json();

    expect(typeof body.totalUsers).toBe("number");
    expect(typeof body.activeAds).toBe("number");
    expect(typeof body.publishedCreators).toBe("number");
    expect(typeof body.monthlyRevenue).toBe("number");
    expect(typeof body.totalPromoCodes).toBe("number");
    expect(typeof body.activePromoCodes).toBe("number");
  });

  it("recentPayments and recentUsers are arrays", async () => {
    const req = buildRequest("/api/admin/stats", { token: adminToken });
    const res = await getStats(req);
    const body = await res.json();

    expect(Array.isArray(body.recentPayments)).toBe(true);
    expect(Array.isArray(body.recentUsers)).toBe(true);
  });

  it("recentUsers items have expected fields", async () => {
    const req = buildRequest("/api/admin/stats", { token: adminToken });
    const res = await getStats(req);
    const body = await res.json();

    if (body.recentUsers.length > 0) {
      const user = body.recentUsers[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("createdAt");
    }
  });
});
