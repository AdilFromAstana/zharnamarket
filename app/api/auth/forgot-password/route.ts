import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/validation";

// Rate limit: 3 запроса с одного IP за 15 минут
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) return false;
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Подождите перед повторной отправкой" },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email?.trim()) return badRequest("Email обязателен");
    if (!isValidEmail(email.trim())) return badRequest("Некорректный формат email");

    const emailLower = email.toLowerCase().trim();

    // Всегда возвращаем 200 — не раскрываем существование аккаунта
    const successResponse = NextResponse.json({
      message: "Если аккаунт с таким email существует, мы отправили инструкции по сбросу пароля.",
    });

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      select: { id: true, email: true, password: true },
    });

    // Если пользователь не найден, без пароля (OAuth) или без email — молча возвращаем OK
    if (!user || !user.password || !user.email) {
      return successResponse;
    }

    // Генерируем token (64 hex символа)
    const rawToken = crypto.randomBytes(32).toString("hex");
    // Храним SHA-256 хеш (не raw token)
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Сохраняем token hash и expiration (1 час)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 час
      },
    });

    // Формируем ссылку для сброса (raw token — не hash)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;

    // Отправляем email
    await sendPasswordResetEmail(user.email, resetUrl);

    return successResponse;
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return serverError();
  }
}
