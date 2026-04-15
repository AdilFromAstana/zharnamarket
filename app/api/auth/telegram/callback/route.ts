import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  badRequest,
  serverError,
} from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { createSession } from "@/lib/sessions";
import { randomAvatarGradient } from "@/lib/utils";

const AUTH_MAX_AGE_SEC = 5 * 60; // окно валидности auth_date — 5 минут

/**
 * POST /api/auth/telegram/callback
 *
 * Принимает JSON-данные авторизации от Telegram, распарсенные клиентом из
 * URL-фрагмента `#tgAuthResult=<base64>`:
 *   { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
 *
 * Валидирует hash через HMAC-SHA256 с bot_token, upsert'ит пользователя
 * по telegramId и выдаёт JWT cookies.
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

  const a = Buffer.from(expectedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return badRequest("Telegram OAuth не настроен");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Некорректное тело запроса");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Некорректное тело запроса");
  }

  // Приводим все значения к строкам для hash-проверки
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    data[key] = String(value);
  }

  const { id, auth_date, hash } = data;

  if (!id || !auth_date || !hash) {
    return badRequest("Отсутствуют обязательные поля Telegram");
  }

  // 1. Проверка срока auth_date (anti-replay)
  const authDateNum = Number(auth_date);
  if (!Number.isFinite(authDateNum)) {
    return badRequest("Некорректный auth_date");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDateNum > AUTH_MAX_AGE_SEC) {
    return NextResponse.json(
      { error: "Срок авторизации истёк, попробуйте снова" },
      { status: 401 },
    );
  }

  // 2. Проверка hash
  if (!verifyTelegramHash(data, botToken)) {
    return NextResponse.json(
      { error: "Неверная подпись Telegram" },
      { status: 401 },
    );
  }

  try {
    const telegramId = String(id);
    const telegramUsername = data.username ?? null;
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      data.username ||
      "Telegram User";
    const avatar = data.photo_url ?? null;

    // 3. Upsert по telegramId
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
        return NextResponse.json(
          { error: "Аккаунт заблокирован. Обратитесь в поддержку." },
          { status: 403 },
        );
      }
      if (user.isDeleted) {
        return NextResponse.json({ error: "Аккаунт удалён." }, { status: 403 });
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

    // 4. JWT + сессия
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
      },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    console.error("[Telegram OAuth callback] Error:", err);
    return serverError();
  }
}
