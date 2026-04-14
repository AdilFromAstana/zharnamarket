import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { createSession } from "@/lib/sessions";
import { randomAvatarGradient } from "@/lib/utils";

const AUTH_MAX_AGE_SEC = 5 * 60; // окно валидности auth_date — 5 минут

interface TelegramAuthData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

/**
 * Проверяет hash от Telegram.
 *
 * Алгоритм (https://core.telegram.org/widgets/login#checking-authorization):
 *   data_check_string = поля "<key>=<value>" отсортированные по key, объединённые '\n' (без hash)
 *   secret_key        = SHA256(bot_token)   — raw bytes
 *   expected_hash     = HMAC_SHA256(secret_key, data_check_string) hex
 */
function verifyTelegramHash(
  data: Record<string, string>,
  botToken: string,
): boolean {
  const { hash, ...fields } = data;
  if (!hash) return false;

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // timing-safe сравнение
  const a = Buffer.from(expectedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=telegram_not_configured`);
  }

  // Собираем все query-параметры в плоский объект (все значения — строки)
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const { id, auth_date, hash } = params as Partial<TelegramAuthData>;

  if (!id || !auth_date || !hash) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=telegram_missing_fields`);
  }

  // 1. Проверка срока auth_date (anti-replay)
  const authDateNum = Number(auth_date);
  if (!Number.isFinite(authDateNum)) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=telegram_invalid_auth_date`);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDateNum > AUTH_MAX_AGE_SEC) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=telegram_expired`);
  }

  // 2. Проверка hash
  if (!verifyTelegramHash(params, botToken)) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=telegram_invalid_hash`);
  }

  try {
    const telegramId = String(id);
    const telegramUsername = params.username ?? null;
    const name =
      [params.first_name, params.last_name].filter(Boolean).join(" ").trim() ||
      params.username ||
      "Telegram User";
    const avatar = params.photo_url ?? null;

    // 3. Upsert пользователя по telegramId
    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        avatarColor: true,
        role: true,
        telegramId: true,
        blocked: true,
        isDeleted: true,
      },
    });

    if (user) {
      if (user.blocked) {
        return NextResponse.redirect(`${appUrl}/auth/login?error=account_blocked`);
      }
      if (user.isDeleted) {
        return NextResponse.redirect(`${appUrl}/auth/login?error=account_deleted`);
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername,
          avatar: user.avatar ?? avatar,
          avatarColor: user.avatarColor ?? randomAvatarGradient(),
          name: user.name || name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          avatarColor: true,
          role: true,
          telegramId: true,
          blocked: true,
          isDeleted: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: null,
          name,
          avatar,
          avatarColor: randomAvatarGradient(),
          telegramId,
          telegramUsername,
          password: null,
          // Telegram сам верифицирует пользователя, email у него просто нет
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          avatarColor: true,
          role: true,
          telegramId: true,
          blocked: true,
          isDeleted: true,
        },
      });
    }

    // 4. JWT токены
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    ]);

    // 5. Сессия
    await createSession(user.id, refreshToken, req);

    // 6. Редирект с cookies
    const response = NextResponse.redirect(`${appUrl}/auth/telegram/success`);
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    console.error("[Telegram OAuth callback] Error:", err);
    return NextResponse.redirect(`${appUrl}/auth/login?error=telegram_server_error`);
  }
}
