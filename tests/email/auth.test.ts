/**
 * Email: Auth & account security scenarios.
 *
 * Проверяем ровно ту функцию email-модуля, которую дергает контроллер,
 * с корректным `to` и ключевыми подстроками в аргументах/html.
 * DB-state проверяем минимально (было необходимо для flow-работы).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  buildRequest,
  createTestUser,
  trackUser,
  cleanup,
} from "../helpers";
import { mailbox } from "./_mailbox";
import { tick } from "./_helpers";

vi.mock("@/lib/email", async () => {
  const m = await import("./_mailbox");
  return m.emailModuleMock;
});

// Lazy-import маршрутов после vi.mock, чтобы они подцепили мок.
async function routes() {
  return {
    register: (await import("@/app/api/auth/register/route")).POST,
    verifyEmail: (await import("@/app/api/auth/verify-email/route")).POST,
    forgotPassword: (await import("@/app/api/auth/forgot-password/route")).POST,
    resetPassword: (await import("@/app/api/auth/reset-password/route")).POST,
    changePassword: (await import("@/app/api/users/me/change-password/route")).POST,
    changeEmail: (await import("@/app/api/users/me/change-email/route")).POST,
  };
}

beforeAll(() => {
  mailbox.clear();
});

afterAll(async () => {
  await cleanup();
});

describe("Email · Auth", () => {
  it("register → sendVerificationCode с 6-значным кодом", async () => {
    const { register } = await routes();
    const email = `verify_${Date.now()}@test.local`;
    const req = buildRequest("/api/auth/register", {
      method: "POST",
      body: { name: "Verify User", email, password: "LongEnough123" },
    });

    const res = await register(req);
    expect(res.status).toBe(201);

    const mail = mailbox.last("sendVerificationCode");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(email.toLowerCase());
    const code = mail!.args[1] as string;
    expect(code).toMatch(/^\d{6}$/);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) trackUser(user.id);
  });

  it("verify-email → sendWelcomeEmail после первой верификации", async () => {
    const { verifyEmail } = await routes();
    const email = `welcome_${Date.now()}@test.local`;

    // Регистрация → получаем код
    const { register } = await routes();
    await register(
      buildRequest("/api/auth/register", {
        method: "POST",
        body: { name: "Welcome User", email, password: "LongEnough123" },
      }),
    );
    const code = mailbox.last("sendVerificationCode")!.args[1] as string;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(user).not.toBeNull();
    trackUser(user!.id);

    const res = await verifyEmail(
      buildRequest("/api/auth/verify-email", {
        method: "POST",
        body: { email, code },
      }),
    );
    expect(res.status).toBe(200);

    const welcome = await mailbox.waitFor("sendWelcomeEmail");
    expect(welcome).toBeDefined();
    expect(welcome!.to).toBe(email.toLowerCase());
    expect(welcome!.args[1]).toMatchObject({ name: "Welcome User" });
  });

  it("forgot-password → sendPasswordResetEmail с ссылкой, содержащей token", async () => {
    const { forgotPassword } = await routes();
    const { user } = await createTestUser({ name: "Reset User" });
    trackUser(user.id);

    const res = await forgotPassword(
      buildRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: user.email },
      }),
    );
    expect(res.status).toBe(200);

    const mail = mailbox.last("sendPasswordResetEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);
    const resetUrl = mail!.args[1] as string;
    expect(resetUrl).toContain("/auth/reset-password?token=");

    // DB-state: token-hash записан
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh!.passwordResetToken).not.toBeNull();
    expect(fresh!.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now());
  });

  it("reset-password → sendPasswordChangedEmail после успешной смены", async () => {
    const { forgotPassword, resetPassword } = await routes();
    const { user } = await createTestUser({ name: "Password Changed User" });
    trackUser(user.id);

    await forgotPassword(
      buildRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: user.email },
      }),
    );
    const rawToken = (mailbox.last("sendPasswordResetEmail")!.args[1] as string).split("token=")[1];

    const res = await resetPassword(
      buildRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: rawToken, password: "BrandNewPass123" },
      }),
    );
    expect(res.status).toBe(200);

    const changed = await mailbox.waitFor("sendPasswordChangedEmail");
    expect(changed).toBeDefined();
    expect(changed!.to).toBe(user.email);
  });

  it("change-password → sendPasswordChangedEmail в кабинете", async () => {
    const { changePassword } = await routes();
    const { user, token, password } = await createTestUser({ name: "Cabinet Change Pw" });
    trackUser(user.id);
    // Сбрасываем счётчик
    mailbox.clear();

    const res = await changePassword(
      buildRequest("/api/users/me/change-password", {
        method: "POST",
        token,
        body: { currentPassword: password, newPassword: "AnotherStrongPass9" },
      }),
    );
    expect(res.status).toBe(200);

    const mail = await mailbox.waitFor("sendPasswordChangedEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);
  });

  it("change-email → sendEmailChangeCode на НОВЫЙ email", async () => {
    const { changeEmail } = await routes();
    const { user, token } = await createTestUser({ name: "Change Email User" });
    trackUser(user.id);

    const newEmail = `new_${Date.now()}@test.local`;
    const res = await changeEmail(
      buildRequest("/api/users/me/change-email", {
        method: "POST",
        token,
        body: { newEmail },
      }),
    );
    expect(res.status).toBe(200);

    const mail = mailbox.last("sendEmailChangeCode");
    expect(mail).toBeDefined();
    // Важно: код шлётся на НОВЫЙ адрес, не на текущий
    expect(mail!.to).toBe(newEmail.toLowerCase());
    expect(mail!.args[1]).toMatch(/^\d{6}$/);

    // DB-state: pendingEmail записан, email не изменён
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh!.pendingEmail).toBe(newEmail.toLowerCase());
    expect(fresh!.email).toBe(user.email);
  });

  it("новое устройство при createSession → sendNewDeviceLoginEmail", async () => {
    const { createSession } = await import("@/lib/sessions");
    const { user } = await createTestUser({ name: "New Device User" });
    trackUser(user.id);
    mailbox.clear();

    const req = buildRequest("/api/auth/login", {
      method: "POST",
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120" },
    });
    await createSession(user.id, "fake_refresh_token_" + Date.now(), req);

    const mail = await mailbox.waitFor("sendNewDeviceLoginEmail");
    expect(mail).toBeDefined();
    expect(mail!.to).toBe(user.email);

    // Повторный вход с того же user-agent → нет повторного письма
    const before = mailbox.count("sendNewDeviceLoginEmail");
    await tick(30);
    await createSession(user.id, "fake_refresh_token_2_" + Date.now(), req);
    await tick(100);
    expect(mailbox.count("sendNewDeviceLoginEmail")).toBe(before);
  });
});
