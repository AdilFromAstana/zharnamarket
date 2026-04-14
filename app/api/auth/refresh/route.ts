import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signAccessToken, signRefreshToken, serverError, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAMES, setAuthCookies } from "@/lib/cookies";
import { findSessionByToken, rotateSessionToken } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  try {
    // Читаем refresh token из httpOnly cookie
    const refreshToken = req.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
    if (!refreshToken) return unauthorized("Refresh token отсутствует");

    // Верифицируем JWT подпись и срок
    const payload = await verifyToken(refreshToken);
    if (!payload?.sub) return unauthorized("Недействительный или истёкший refresh токен");

    // Проверяем что сессия существует в БД (token hash match)
    const session = await findSessionByToken(payload.sub, refreshToken);
    if (!session) return unauthorized("Сессия не найдена или отозвана");

    // Проверяем что пользователь существует и получаем актуальную роль
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, blocked: true, isDeleted: true },
    });
    if (!user) return unauthorized("Пользователь не найден");
    if (user.blocked) return unauthorized("Аккаунт заблокирован");
    if (user.isDeleted) return unauthorized("Аккаунт удалён");

    // Выпускаем новую пару токенов с актуальной ролью из БД
    const [newAccessToken, newRefreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    ]);

    // Ротация: обновляем хеш refresh token в сессии
    await rotateSessionToken(session.id, newRefreshToken);

    // Устанавливаем новые cookies
    const response = NextResponse.json({ success: true });
    setAuthCookies(response, newAccessToken, newRefreshToken);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/refresh]", err);
    return serverError();
  }
}
