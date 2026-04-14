import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, badRequest, serverError } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { createSession } from "@/lib/sessions";
import { generateAndSendCode } from "@/lib/verification";

// ─── Простой in-memory rate limiter ─────────────────────────────────────────
// Максимум 10 попыток за 15 минут с одного IP
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 минут
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
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

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Попробуйте через 15 минут." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { login, password } = body as {
      login?: string; // email или phone
      password?: string;
    };

    if (!login?.trim()) return badRequest("Введите email или телефон");
    if (!password) return badRequest("Введите пароль");

    const loginNorm = login.toLowerCase().trim();

    // Ищем пользователя по email или phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: loginNorm }, { phone: login.trim() }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    // Проверяем пароль (OAuth-пользователи не имеют пароля)
    if (!user.password) {
      const provider = user.googleId
        ? "Google"
        : user.telegramId
          ? "Telegram"
          : null;
      const message = provider
        ? `Этот аккаунт создан через ${provider}. Используйте кнопку «Войти через ${provider}».`
        : "Неверный логин или пароль";
      return NextResponse.json(
        { error: message },
        { status: provider ? 400 : 401 },
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    // Проверяем блокировку и удаление
    if (user.blocked) {
      return NextResponse.json(
        { error: "Аккаунт заблокирован. Обратитесь в поддержку." },
        { status: 403 },
      );
    }
    if (user.isDeleted) {
      return NextResponse.json(
        { error: "Аккаунт удалён. Для восстановления обратитесь в поддержку." },
        { status: 403 },
      );
    }

    // Проверяем верификацию email (только для аккаунтов с email)
    if (!user.emailVerified && user.email) {
      // Генерируем новый код и отправляем
      await generateAndSendCode(user.id, user.email);
      return NextResponse.json(
        {
          requireVerification: true,
          email: user.email,
          message: "Подтвердите email для входа. Код отправлен.",
        },
        { status: 403 },
      );
    }

    // Создаём токены
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    ]);

    // Создаём серверную сессию (хранит хеш refresh token)
    await createSession(user.id, refreshToken, req);

    // Устанавливаем httpOnly cookies и возвращаем только user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return serverError();
  }
}
