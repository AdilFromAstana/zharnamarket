import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/users/me/set-password
 * Sets a password for OAuth-only users who don't have one yet.
 * Body: { password: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { password } = body as { password?: string };

    if (!password || password.length < 8) {
      return badRequest("Пароль должен содержать минимум 8 символов");
    }
    if (password.length > 128) {
      return badRequest("Пароль слишком длинный");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) return unauthorized();

    if (user.password) {
      return badRequest("Пароль уже установлен. Используйте смену пароля.");
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return NextResponse.json({ message: "Пароль установлен" });
  } catch (err) {
    console.error("[POST /api/users/me/set-password]", err);
    return serverError();
  }
}
