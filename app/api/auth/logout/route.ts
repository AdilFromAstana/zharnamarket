import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, verifyToken, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAMES, clearAuthCookies } from "@/lib/cookies";
import { findSessionByToken } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    // Опционально: можно удалить конкретную сессию по ID из body
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };

    if (sessionId) {
      // Удаление конкретной сессии (из настроек)
      await prisma.session.deleteMany({
        where: { id: sessionId, userId },
      });
    } else {
      // Удаление текущей сессии по refresh token из cookie
      const refreshToken = req.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
      if (refreshToken) {
        const payload = await verifyToken(refreshToken);
        if (payload?.sub) {
          const session = await findSessionByToken(payload.sub, refreshToken);
          if (session) {
            await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
          }
        }
      }
    }

    // Очищаем httpOnly cookies
    const response = NextResponse.json({ message: "Выход выполнен" });
    clearAuthCookies(response);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/logout]", err);
    return serverError();
  }
}
