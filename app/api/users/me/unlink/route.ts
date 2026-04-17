import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/users/me/unlink
 * Unlinks a provider from the current user.
 * Body: { provider: "google" | "telegram" }
 *
 * Cannot unlink if it would leave the user with no way to sign in.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { provider } = body as { provider?: string };

    if (!provider || !["google", "telegram"].includes(provider)) {
      return badRequest("Укажите провайдер: google или telegram");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        googleId: true,
        telegramId: true,
        email: true,
      },
    });

    if (!user) return unauthorized();

    // Count remaining auth methods after unlinking
    let methodsAfter = 0;
    if (user.password && user.email) methodsAfter++; // email+password login
    if (user.googleId && provider !== "google") methodsAfter++;
    if (user.telegramId && provider !== "telegram") methodsAfter++;

    if (methodsAfter === 0) {
      return badRequest(
        "Невозможно отвязать — это единственный способ входа. Сначала привяжите другой метод или установите пароль.",
      );
    }

    if (provider === "google") {
      if (!user.googleId) return badRequest("Google не привязан");
      await prisma.user.update({
        where: { id: userId },
        data: { googleId: null },
      });
    } else {
      if (!user.telegramId) return badRequest("Telegram не привязан");
      await prisma.user.update({
        where: { id: userId },
        data: { telegramId: null, telegramUsername: null },
      });
    }

    return NextResponse.json({ message: `${provider} отвязан` });
  } catch (err) {
    console.error("[POST /api/users/me/unlink]", err);
    return serverError();
  }
}
