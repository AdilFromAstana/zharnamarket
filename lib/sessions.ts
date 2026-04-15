import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/user-agent";
import { sendNewDeviceLoginEmail } from "@/lib/email";

/**
 * Создаёт запись Session в БД при login/register/oauth.
 *
 * Хранит SHA-256 хеш refresh token (не сам токен).
 * При refresh — проверяем хеш, обновляем на новый.
 */

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Создаёт новую сессию в БД.
 */
export async function createSession(
  userId: string,
  refreshToken: string,
  req: NextRequest,
): Promise<string> {
  const tokenHash = hashToken(refreshToken);
  const ua = parseUserAgent(req.headers.get("user-agent"));
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  // Определяем "новое" устройство до создания сессии: если у пользователя ещё
  // не было сессии с такой комбинацией device/os/browser — это новое устройство.
  const priorDeviceSession = await prisma.session.findFirst({
    where: {
      userId,
      device: ua.device,
      os: ua.os,
      browser: ua.browser,
    },
    select: { id: true },
  });
  const isNewDevice = !priorDeviceSession;

  // Снимаем флаг isCurrent с предыдущих сессий этого пользователя
  await prisma.session.updateMany({
    where: { userId, isCurrent: true },
    data: { isCurrent: false },
  });

  const session = await prisma.session.create({
    data: {
      userId,
      token: tokenHash,
      device: ua.device,
      os: ua.os,
      browser: ua.browser,
      ip,
      isCurrent: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
    },
  });

  // Очищаем истёкшие сессии (fire-and-forget)
  cleanupExpiredSessions(userId).catch(() => {});

  // Уведомляем о новом устройстве (fire-and-forget), если включено в настройках
  if (isNewDevice) {
    notifyNewDeviceLogin(userId, {
      device: ua.device,
      os: ua.os,
      browser: ua.browser,
      ip,
    }).catch(() => {});
  }

  return session.id;
}

async function notifyNewDeviceLogin(
  userId: string,
  info: { device: string | null; os: string | null; browser: string | null; ip: string | null },
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        notificationSettings: { select: { emailSecurity: true } },
      },
    });
    if (!user?.email) return;
    // По умолчанию — включено. Если настройка явно выключена — не шлём.
    if (user.notificationSettings && !user.notificationSettings.emailSecurity) return;

    await sendNewDeviceLoginEmail(user.email, { ...info, at: new Date() });
  } catch (err) {
    console.error("[notifyNewDeviceLogin]", err);
  }
}

/**
 * Находит сессию по хешу refresh token.
 * Возвращает session или null если не найдена/истекла.
 */
export async function findSessionByToken(
  userId: string,
  refreshToken: string,
): Promise<{ id: string } | null> {
  const tokenHash = hashToken(refreshToken);

  return prisma.session.findFirst({
    where: {
      userId,
      token: tokenHash,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
}

/**
 * Ротирует refresh token в сессии (обновляет хеш + lastActiveAt).
 */
export async function rotateSessionToken(
  sessionId: string,
  newRefreshToken: string,
): Promise<void> {
  const newHash = hashToken(newRefreshToken);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      token: newHash,
      lastActiveAt: new Date(),
    },
  });
}

/**
 * Удаляет сессию (при logout).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/**
 * Удаляет все истёкшие сессии пользователя.
 */
export async function cleanupExpiredSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });
}
