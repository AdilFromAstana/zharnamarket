import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/tasks/[id]/applications/[appId]/review
 * Заказчик одобряет или отклоняет видео.
 * Тело: { action: "approve" | "reject", note?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId, appId } = await params;
    const body = await req.json();
    const { action, note } = body as { action: "approve" | "reject"; note?: string };

    if (!action || !["approve", "reject"].includes(action)) {
      return badRequest("Укажите action: approve или reject");
    }

    // Проверяем задание и доступ
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { ownerId: true, paymentMode: true },
    });

    if (!ad) return badRequest("Задание не найдено");
    if (ad.ownerId !== userId) return badRequest("Нет доступа");
    if (ad.paymentMode !== "escrow") return badRequest("Только для escrow заданий");

    // Находим заявку
    const application = await prisma.taskApplication.findUnique({
      where: { id: appId },
      select: {
        id: true,
        adId: true,
        contentStatus: true,
        contentReviewDeadline: true,
      },
    });

    if (!application) return badRequest("Заявка не найдена");
    if (application.adId !== adId) return badRequest("Заявка не принадлежит этому заданию");

    // Lazy-check авто-одобрения
    if (
      application.contentStatus === "pending_review" &&
      application.contentReviewDeadline &&
      new Date() > application.contentReviewDeadline
    ) {
      // 72h истекло — уже авто-одобрено
      await prisma.taskApplication.update({
        where: { id: application.id },
        data: { contentStatus: "content_approved" },
      });
      return NextResponse.json({
        ok: true,
        message: "Заявка уже была авто-одобрена (72ч истекло)",
        contentStatus: "content_approved",
      });
    }

    if (application.contentStatus !== "pending_review") {
      return badRequest(`Заявка не ожидает проверки (статус: ${application.contentStatus})`);
    }

    const now = new Date();

    const updated = await prisma.taskApplication.update({
      where: { id: application.id },
      data: {
        contentStatus: action === "approve" ? "content_approved" : "content_rejected",
        contentReviewedAt: now,
        contentRejectionNote: action === "reject" ? (note ?? null) : null,
      },
    });

    return NextResponse.json({
      ok: true,
      contentStatus: updated.contentStatus,
    });
  } catch (err) {
    console.error("[PATCH /api/tasks/[id]/applications/[appId]/review]", err);
    return serverError();
  }
}
