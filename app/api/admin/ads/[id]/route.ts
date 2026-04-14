import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/ads/[id] — модерация объявления.
 *
 * Body: { status?: string, deletedAt?: null } — изменить статус или восстановить.
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
    const { status, restore } = body as { status?: string; restore?: boolean };

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    // Восстановить мягко удалённое
    if (restore) {
      data.deletedAt = null;
      data.status = "draft";
    }

    // Изменить статус
    const validStatuses = ["draft", "active", "paused", "expired", "archived"];
    if (status && validStatuses.includes(status)) {
      data.status = status;
    }

    // Soft delete
    if (status === "deleted") {
      data.deletedAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      return badRequest("Нет полей для обновления");
    }

    const updated = await prisma.ad.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/ads/[id]]", err);
    return serverError();
  }
}
