import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, verifyToken, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAMES, clearAuthCookies } from "@/lib/cookies";
import { findSessionByToken } from "@/lib/sessions";

// Идемпотентен: всегда чистит cookies, даже если сессия уже невалидна.
// Иначе клиент с протухшим токеном попадает в цикл redirect'ов.
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);

    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };

    if (userId) {
      if (sessionId) {
        await prisma.session.deleteMany({
          where: { id: sessionId, userId },
        });
      } else {
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
    }

    const response = NextResponse.json({ message: "Выход выполнен" });
    clearAuthCookies(response);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/logout]", err);
    return serverError();
  }
}
