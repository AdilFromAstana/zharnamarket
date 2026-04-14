import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tasks/[id]/applications — Список заявок на escrow-задание.
 * Доступно только владельцу объявления.
 * Включает lazy-check дедлайнов для всех заявок.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;

    // Проверяем доступ
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { ownerId: true, paymentMode: true },
    });

    if (!ad) return badRequest("Задание не найдено");
    if (ad.ownerId !== userId) return badRequest("Нет доступа");
    if (ad.paymentMode !== "escrow") return badRequest("Только для escrow заданий");

    // Получаем все заявки
    const applications = await prisma.taskApplication.findMany({
      where: { adId },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            creatorProfiles: {
              select: {
                id: true,
                bio: true,
                platforms: true,
              },
              take: 1,
            },
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            claimedViews: true,
            approvedViews: true,
            rejectionReason: true,
            reservedAmount: true,
            payoutAmount: true,
            submittedAt: true,
          },
        },
      },
    });

    // Lazy-check дедлайнов и обновление при необходимости
    const now = new Date();
    const updates: { id: string; contentStatus: string }[] = [];

    const resolved = applications.map((app) => {
      let newStatus = app.contentStatus;

      if (
        app.contentStatus === "pending_video" &&
        app.videoDeadline &&
        now > app.videoDeadline
      ) {
        newStatus = "video_timed_out";
      } else if (
        app.contentStatus === "pending_review" &&
        app.contentReviewDeadline &&
        now > app.contentReviewDeadline
      ) {
        newStatus = "content_approved";
      }

      if (newStatus !== app.contentStatus) {
        updates.push({ id: app.id, contentStatus: newStatus });
        return { ...app, contentStatus: newStatus as typeof app.contentStatus };
      }

      return app;
    });

    // Применяем обновления в фоне
    if (updates.length > 0) {
      await Promise.all(
        updates.map(({ id, contentStatus }) =>
          prisma.taskApplication.update({
            where: { id },
            data: { contentStatus: contentStatus as never },
          }),
        ),
      );
    }

    return NextResponse.json({ data: resolved });
  } catch (err) {
    console.error("[GET /api/tasks/[id]/applications]", err);
    return serverError();
  }
}
