import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword) return badRequest("Введите текущий пароль");
    if (!newPassword || newPassword.length < 8)
      return badRequest("Новый пароль должен содержать минимум 8 символов");
    if (newPassword.length > 128)
      return badRequest("Пароль не может быть длиннее 128 символов");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return unauthorized();
    if (!user.password) return badRequest("У вашего аккаунта нет пароля (вход через Google)");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return NextResponse.json(
        { error: "Текущий пароль неверный" },
        { status: 400 },
      );
    }

    const hashedNew = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNew },
    });

    return NextResponse.json({ message: "Пароль успешно изменён" });
  } catch (err) {
    console.error("[POST /api/users/me/change-password]", err);
    return serverError();
  }
}
