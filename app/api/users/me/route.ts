import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLength, LIMITS } from "@/lib/validation";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  avatarColor: true,
  role: true,
  emailVerified: true,
  googleId: true,
  telegramId: true,
  telegramUsername: true,
  password: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/users/me — текущий пользователь
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) return notFound("Пользователь не найден");

    // Never expose password hash; expose hasPassword boolean instead
    const { password, ...rest } = user;
    return NextResponse.json({ ...rest, hasPassword: !!password });
  } catch (err) {
    console.error("[GET /api/users/me]", err);
    return serverError();
  }
}

// PATCH /api/users/me — обновить имя и телефон
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { name, phone, avatar } = body as { name?: string; phone?: string; avatar?: string | null };

    if (name !== undefined) {
      if (!name.trim()) return badRequest("Имя не может быть пустым");
      const nameErr = checkLength(name.trim(), "Имя", LIMITS.name.min, LIMITS.name.max);
      if (nameErr) return badRequest(nameErr);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() || null }),
        ...(avatar !== undefined && { avatar }),
      },
      select: USER_SELECT,
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("[PATCH /api/users/me]", err);
    return serverError();
  }
}

// DELETE /api/users/me — soft-delete аккаунта (isDeleted = true)
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });

    return NextResponse.json({
      message: "Аккаунт помечен как удалённый. Для восстановления обратитесь в поддержку.",
    });
  } catch (err) {
    console.error("[DELETE /api/users/me]", err);
    return serverError();
  }
}
