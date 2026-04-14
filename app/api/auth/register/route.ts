import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError } from "@/lib/auth";
import { isValidEmail, checkLength, LIMITS } from "@/lib/validation";
import { generateAndSendCode } from "@/lib/verification";
import { randomAvatarGradient } from "@/lib/utils";

// ─── Простой in-memory rate limiter ─────────────────────────────────────────
// Максимум 5 регистраций с одного IP за 60 минут
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 60 минут
const MAX_REGISTRATIONS = 5;
const regAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRegisterRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = regAttempts.get(ip);

  if (!record || now > record.resetAt) {
    regAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REGISTRATIONS) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Получаем IP из заголовков
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRegisterRateLimit(ip)) {
    return NextResponse.json(
      { error: "Слишком много попыток регистрации. Попробуйте через час." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { name, email, phone, password } = body as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    // Валидация
    if (!name?.trim()) return badRequest("Имя обязательно");
    const nameErr = checkLength(name!.trim(), "Имя", LIMITS.name.min, LIMITS.name.max);
    if (nameErr) return badRequest(nameErr);

    if (!email?.trim()) return badRequest("Email обязателен");
    if (!isValidEmail(email.trim())) return badRequest("Некорректный формат email");

    if (!password || password.length < LIMITS.password.min)
      return badRequest(`Пароль должен содержать минимум ${LIMITS.password.min} символов`);
    if (password.length > LIMITS.password.max)
      return badRequest(`Пароль не может быть длиннее ${LIMITS.password.max} символов`);

    const emailLower = email.toLowerCase().trim();

    // Проверка на дубликат
    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже зарегистрирован" },
        { status: 409 },
      );
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создаём пользователя (emailVerified: false по умолчанию)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        phone: phone?.trim() || null,
        password: hashedPassword,
        avatarColor: randomAvatarGradient(),
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Генерируем и отправляем код подтверждения на email
    await generateAndSendCode(user.id, user.email);

    // НЕ выдаём JWT — пользователь должен подтвердить email
    return NextResponse.json(
      {
        requireVerification: true,
        email: user.email,
        message: "Код подтверждения отправлен на email",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return serverError();
  }
}
