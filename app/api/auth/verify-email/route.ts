import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, badRequest, serverError } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { createSession } from "@/lib/sessions";
import { hashCode } from "@/lib/verification";

// ─── Rate limiter: 10 попыток / 15 мин на IP ───────────────────────────────
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
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

/**
 * POST /api/auth/verify-email — подтверждение email 6-значным кодом.
 * После успешной верификации — выдаёт JWT токены и авторизует.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через 15 минут." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { email, code } = body as { email?: string; code?: string };

    if (!email?.trim()) return badRequest("Email обязателен");
    if (!code?.trim()) return badRequest("Код обязателен");

    const codeClean = code.trim().replace(/\s/g, "");
    if (!/^\d{6}$/.test(codeClean)) {
      return badRequest("Код должен содержать 6 цифр");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Неверный код подтверждения" },
        { status: 400 },
      );
    }

    // Проверяем блокировку и удаление
    if (user.blocked) {
      return NextResponse.json(
        { error: "Аккаунт заблокирован." },
        { status: 403 },
      );
    }
    if (user.isDeleted) {
      return NextResponse.json(
        { error: "Аккаунт удалён." },
        { status: 403 },
      );
    }

    // Уже верифицирован
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email уже подтверждён. Войдите в систему." },
        { status: 400 },
      );
    }

    // Проверяем код
    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return NextResponse.json(
        { error: "Код не был запрошен. Зарегистрируйтесь заново." },
        { status: 400 },
      );
    }

    if (new Date() > user.emailVerificationExpires) {
      return NextResponse.json(
        { error: "Код истёк. Запросите новый код." },
        { status: 400 },
      );
    }

    const hashedInput = hashCode(codeClean);
    if (hashedInput !== user.emailVerificationCode) {
      return NextResponse.json(
        { error: "Неверный код подтверждения" },
        { status: 400 },
      );
    }

    // Верификация успешна — обновляем пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpires: null,
      },
    });

    // Выдаём JWT токены
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    ]);

    await createSession(user.id, refreshToken, req);

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        emailVerified: true,
        createdAt: user.createdAt,
      },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/verify-email]", err);
    return serverError();
  }
}
