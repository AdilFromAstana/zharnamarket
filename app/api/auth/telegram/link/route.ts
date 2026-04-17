import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AUTH_MAX_AGE_SEC = 5 * 60;

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

/**
 * POST /api/auth/telegram/link
 * Links Telegram account to current authenticated user.
 * Body: Telegram auth data { id, first_name, ..., auth_date, hash }
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return badRequest("Telegram OAuth не настроен");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Некорректное тело запроса");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Некорректное тело запроса");
  }

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    data[key] = String(value);
  }

  const { id, auth_date, hash } = data;
  if (!id || !auth_date || !hash) {
    return badRequest("Отсутствуют обязательные поля Telegram");
  }

  const authDateNum = Number(auth_date);
  if (!Number.isFinite(authDateNum)) return badRequest("Некорректный auth_date");

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDateNum > AUTH_MAX_AGE_SEC) {
    return NextResponse.json(
      { error: "Срок авторизации истёк, попробуйте снова" },
      { status: 401 },
    );
  }

  if (!verifyTelegramHash(data, botToken)) {
    return NextResponse.json(
      { error: "Неверная подпись Telegram" },
      { status: 401 },
    );
  }

  try {
    const telegramId = String(id);
    const telegramUsername = data.username ?? null;

    // Check if this Telegram is already linked to another user
    const existingTgUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (existingTgUser && existingTgUser.id !== userId) {
      return badRequest("Этот Telegram-аккаунт уже привязан к другому пользователю");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { telegramId, telegramUsername },
    });

    return NextResponse.json({ message: "Telegram привязан" });
  } catch (err) {
    console.error("[POST /api/auth/telegram/link]", err);
    return serverError();
  }
}
