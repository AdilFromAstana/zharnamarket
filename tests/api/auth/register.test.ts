import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildRequest } from "../../helpers";
import bcrypt from "bcryptjs";

import { POST as register } from "@/app/api/auth/register/route";

// Track users for cleanup
const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: createdEmails } },
    });
  }
});

function testEmail(): string {
  const email = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.local`;
  createdEmails.push(email);
  return email;
}

describe("POST /api/auth/register", () => {
  it("returns 400 if name is missing", async () => {
    const req = buildRequest("/api/auth/register", {
      method: "POST",
      body: { email: "x@x.com", password: "12345678" },
    });
    const res = await register(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if email is missing", async () => {
    const req = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "Test", password: "12345678" },
    });
    const res = await register(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if password is too short", async () => {
    const req = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "Test", email: "x@x.com", password: "short" },
    });
    const res = await register(req);
    expect(res.status).toBe(400);
  });

  it("creates user with 201, returns requireVerification + email (no cookies)", async () => {
    const email = testEmail();
    const req = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "New User", email, password: "LongEnough123" },
    });
    const res = await register(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    // New behavior: no user object, requires email verification
    expect(body.requireVerification).toBe(true);
    expect(body.email).toBe(email.toLowerCase());
    // No cookies should be set (user must verify first)
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c: string) => c.startsWith("vw_access="))).toBe(false);
    expect(cookies.some((c: string) => c.startsWith("vw_refresh="))).toBe(false);
    expect(cookies.some((c: string) => c.startsWith("vw_auth_flag=1"))).toBe(false);
  });

  it("stores password as bcrypt hash, not plaintext", async () => {
    const email = testEmail();
    const password = "SecurePass999";
    const req = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "Hash Test", email, password },
    });
    const res = await register(req);
    expect(res.status).toBe(201);

    const dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.password).not.toBe(password);
    const match = await bcrypt.compare(password, dbUser!.password!);
    expect(match).toBe(true);
    // New: user should NOT be verified yet
    expect(dbUser!.emailVerified).toBe(false);
    expect(dbUser!.emailVerificationCode).toBeDefined();
  });

  it("returns 409 for duplicate email", async () => {
    const email = testEmail();
    // First registration
    const req1 = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "First", email, password: "12345678" },
    });
    const res1 = await register(req1);
    expect(res1.status).toBe(201);

    // Second registration with same email
    const req2 = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "Second", email, password: "12345678" },
    });
    const res2 = await register(req2);
    expect(res2.status).toBe(409);
  });
});
