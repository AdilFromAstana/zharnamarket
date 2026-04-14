import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/users/[id] — обновить роль или заблокировать/разблокировать.
 *
 * Body: { role?: "user" | "admin", blocked?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { role, blocked, isDeleted } = body as { role?: string; blocked?: boolean; isDeleted?: boolean };

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Prevent admin from demoting themselves
    if (role && id === auth.userId) {
      return badRequest("Нельзя изменить свою собственную роль");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (role === "user" || role === "admin") {
      data.role = role;
    }

    if (typeof blocked === "boolean") {
      data.blocked = blocked;
      data.blockedAt = blocked ? new Date() : null;
    }

    if (typeof isDeleted === "boolean") {
      data.isDeleted = isDeleted;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("Нет полей для обновления");
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        blocked: true,
        blockedAt: true,
        isDeleted: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/users/[id]]", err);
    return serverError();
  }
}
