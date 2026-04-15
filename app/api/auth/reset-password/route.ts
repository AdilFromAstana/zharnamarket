import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError } from "@/lib/auth";
import { LIMITS } from "@/lib/validation";
import { sendPasswordChangedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body as { token?: string; password?: string };

    if (!token) return badRequest("Токен обязателен");
    if (!password || password.length < LIMITS.password.min) {
      return badRequest(`Пароль должен содержать минимум ${LIMITS.password.min} символов`);
    }
    if (password.length > LIMITS.password.max) {
      return badRequest(`Пароль не может быть длиннее ${LIMITS.password.max} символов`);
    }

    // Хешируем полученный token для сравнения с БД
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Ищем пользователя с валидным, не истёкшим token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        notificationSettings: { select: { emailSecurity: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Ссылка недействительна или истекла. Запросите новую." },
        { status: 400 },
      );
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(password, 12);

    // Обновляем пароль и очищаем reset-поля
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Инвалидируем все сессии пользователя (forced re-login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Подтверждающее письмо (если включены security-уведомления)
    if (
      user.email &&
      (!user.notificationSettings || user.notificationSettings.emailSecurity)
    ) {
      sendPasswordChangedEmail(user.email).catch((err) => {
        console.error("[sendPasswordChangedEmail]", err);
      });
    }

    return NextResponse.json({
      message: "Пароль успешно обновлён. Войдите с новым паролем.",
    });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return serverError();
  }
}
