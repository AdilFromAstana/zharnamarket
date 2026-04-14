/**
 * Integration tests — POST /api/auth/verify-email + POST /api/auth/resend-code
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildRequest } from "../../helpers";
import { hashCode, generateCode } from "@/lib/verification";
import bcrypt from "bcryptjs";

import { POST as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as resendCode } from "@/app/api/auth/resend-code/route";

// ─── Shared state ───────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const TEST_PASSWORD = "VerifyTestPass123";
const CODE_TTL_MS = 15 * 60 * 1000;

function testEmail(): string {
  return `verify_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.local`;
}

async function createUnverifiedUser(email: string, code: string) {
  const hash = await bcrypt.hash(TEST_PASSWORD, 4);
  const user = await prisma.user.create({
    data: {
      name: "Verify Test",
      email: email.toLowerCase(),
      password: hash,
      role: "user",
      emailVerified: false,
      emailVerificationCode: hashCode(code),
      emailVerificationExpires: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/auth/verify-email", () => {
  it("returns 400 if email is missing", async () => {
    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { code: "123456" },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if code is missing", async () => {
    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email: "test@test.com" },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if code is not 6 digits", async () => {
    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email: "test@test.com", code: "abc" },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("6 цифр");
  });

  it("returns 400 for wrong code", async () => {
    const email = testEmail();
    await createUnverifiedUser(email, "111111");

    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email, code: "999999" },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Неверный код");
  });

  it("returns 400 for expired code", async () => {
    const email = testEmail();
    const code = "222222";
    const hash = await bcrypt.hash(TEST_PASSWORD, 4);
    const user = await prisma.user.create({
      data: {
        name: "Expired Code",
        email: email.toLowerCase(),
        password: hash,
        role: "user",
        emailVerified: false,
        emailVerificationCode: hashCode(code),
        emailVerificationExpires: new Date(Date.now() - 1000), // expired 1s ago
      },
    });
    createdUserIds.push(user.id);

    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email, code },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("истёк");
  });

  it("returns 400 if already verified", async () => {
    const email = testEmail();
    const hash = await bcrypt.hash(TEST_PASSWORD, 4);
    const user = await prisma.user.create({
      data: {
        name: "Already Verified",
        email: email.toLowerCase(),
        password: hash,
        role: "user",
        emailVerified: true,
      },
    });
    createdUserIds.push(user.id);

    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email, code: "123456" },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("уже подтверждён");
  });

  it("success: verifies email, returns user + JWT cookies", async () => {
    const email = testEmail();
    const code = "333333";
    await createUnverifiedUser(email, code);

    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email, code },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email.toLowerCase());
    expect(body.user.emailVerified).toBe(true);

    // JWT cookies should be set
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c: string) => c.startsWith("vw_access="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("vw_refresh="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("vw_auth_flag=1"))).toBe(true);
  });

  it("success: DB has emailVerified=true, verification code cleared", async () => {
    const email = testEmail();
    const code = "444444";
    const user = await createUnverifiedUser(email, code);

    const req = buildRequest("/api/auth/verify-email", {
      method: "POST",
      body: { email, code },
    });
    const res = await verifyEmail(req);
    expect(res.status).toBe(200);

    // Check DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser!.emailVerified).toBe(true);
    expect(dbUser!.emailVerificationCode).toBeNull();
    expect(dbUser!.emailVerificationExpires).toBeNull();
  });
});

describe("POST /api/auth/resend-code", () => {
  it("returns 200 and sends new code for unverified user", async () => {
    const email = testEmail();
    const user = await createUnverifiedUser(email, "555555");

    const req = buildRequest("/api/auth/resend-code", {
      method: "POST",
      body: { email },
    });
    const res = await resendCode(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);

    // DB should have a new verification code (different from original)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser!.emailVerificationCode).not.toBeNull();
    expect(dbUser!.emailVerificationCode).not.toBe(hashCode("555555"));
  });

  it("returns 200 even for non-existent email (security)", async () => {
    const req = buildRequest("/api/auth/resend-code", {
      method: "POST",
      body: { email: "nonexistent_1234567@test.local" },
    });
    const res = await resendCode(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
  });
});
