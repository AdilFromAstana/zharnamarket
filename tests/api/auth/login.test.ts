import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { buildRequest } from "../../helpers";

import { POST as login } from "@/app/api/auth/login/route";

// Pre-create test users
const testPassword = "LoginTestPass123";
let regularEmail: string;
let adminEmail: string;
let regularUserId: string;
let adminUserId: string;
let oauthEmail: string;
let oauthUserId: string;

afterAll(async () => {
  const ids = [regularUserId, adminUserId, oauthUserId].filter(Boolean);
  if (ids.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});

describe("POST /api/auth/login", () => {
  it("setup: create test users for login tests", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    regularEmail = `login_user_${suffix}@test.local`;
    adminEmail = `login_admin_${suffix}@test.local`;
    oauthEmail = `login_oauth_${suffix}@test.local`;

    const hash = await bcrypt.hash(testPassword, 4);

    const [regular, admin, oauth] = await Promise.all([
      prisma.user.create({
        data: { name: "Login User", email: regularEmail, password: hash, role: "user", emailVerified: true },
      }),
      prisma.user.create({
        data: { name: "Login Admin", email: adminEmail, password: hash, role: "admin", emailVerified: true },
      }),
      prisma.user.create({
        data: { name: "OAuth User", email: oauthEmail, googleId: "google-123", role: "user", emailVerified: true },
      }),
    ]);

    regularUserId = regular.id;
    adminUserId = admin.id;
    oauthUserId = oauth.id;
  });

  it("returns 400 if login is empty", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: "", password: "anything" },
    });
    const res = await login(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if password is empty", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: regularEmail, password: "" },
    });
    const res = await login(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 for non-existent user", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: "nonexistent@test.local", password: testPassword },
    });
    const res = await login(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: regularEmail, password: "WrongPassword999" },
    });
    const res = await login(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for OAuth user (no password)", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: oauthEmail, password: "anything" },
    });
    const res = await login(req);
    expect(res.status).toBe(400);
  });

  it("logs in regular user successfully with role=user", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: regularEmail, password: testPassword },
    });
    const res = await login(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.email).toBe(regularEmail);
    expect(body.user.role).toBe("user");
    // Tokens are now in httpOnly cookies, not in response body
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c: string) => c.startsWith("vw_access="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("vw_refresh="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("vw_auth_flag=1"))).toBe(true);
    // Password must NOT be in response
    expect(body.user.password).toBeUndefined();
  });

  it("logs in admin user successfully with role=admin", async () => {
    const req = buildRequest("/api/auth/login", {
      method: "POST",
      body: { login: adminEmail, password: testPassword },
    });
    const res = await login(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.email).toBe(adminEmail);
    expect(body.user.role).toBe("admin");
    // Tokens are now in httpOnly cookies
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c: string) => c.startsWith("vw_access="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("vw_refresh="))).toBe(true);
  });
});
