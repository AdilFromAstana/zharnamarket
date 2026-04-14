import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tasks/[id]/cancel — Отменить эскроу-задание и вернуть остаток.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { ownerId: true, status: true, paymentMode: true },
    });

    if (!ad) return badRequest("Задание не найдено");
    if (ad.ownerId !== userId) return badRequest("Нет доступа");
    if (ad.paymentMode !== "escrow") return badRequest("Задание не в эскроу-режиме");
    if (ad.status === "cancelled" || ad.status === "deleted") {
      return badRequest("Задание уже отменено");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const escrow = await tx.escrowAccount.findUnique({
        where: { adId },
      });

      // Проверяем нет ли подач на модерации
      const pendingSubmissions = await tx.videoSubmission.count({
        where: { adId, status: "submitted" },
      });

      if (pendingSubmissions > 0) {
        throw new Error("PENDING_SUBMISSIONS");
      }

      const refundAmount = escrow?.available ?? 0;

      // Обновить эскроу
      if (escrow) {
        await tx.escrowAccount.update({
          where: { adId },
          data: { available: 0, status: "cancelled" },
        });
      }

      // Отменить задание
      await tx.ad.update({
        where: { id: adId },
        data: { status: "cancelled" },
      });

      return { refundAmount, spentAmount: escrow?.spentAmount ?? 0 };
    });

    return NextResponse.json({
      ok: true,
      refundAmount: result.refundAmount,
      spentAmount: result.spentAmount,
      message: `Задание отменено. К возврату: ${result.refundAmount.toLocaleString()} ₸`,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PENDING_SUBMISSIONS") {
      return badRequest("Нельзя отменить задание пока есть подачи на модерации");
    }
    console.error("[POST /api/tasks/[id]/cancel]", err);
    return serverError();
  }
}
