import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidUrl } from "@/lib/validation";
import { MODERATION_SLA_HOURS, PLATFORM_COMMISSION_RATE } from "@/lib/constants";

/**
 * POST /api/tasks/[id]/submissions — Креатор подаёт видео на проверку.
 * Автопроверки + резервирование бюджета.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;
    const body = await req.json();
    const { videoUrl, screenshotUrl, claimedViews } = body;

    // Валидация полей
    if (!videoUrl || !isValidUrl(videoUrl)) return badRequest("Некорректная ссылка на видео");
    if (!screenshotUrl) return badRequest("Скриншот статистики обязателен");
    if (!claimedViews || typeof claimedViews !== "number" || claimedViews < 1) {
      return badRequest("Укажите количество просмотров");
    }

    // Проверяем задание
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        status: true,
        paymentMode: true,
        rpm: true,
        minViews: true,
        maxViewsPerCreator: true,
        submissionDeadline: true,
        title: true,
      },
    });

    if (!ad) return badRequest("Задание не найдено");
    if (ad.paymentMode !== "escrow") return badRequest("Задание не поддерживает подачу");
    if (ad.status !== "active") return badRequest("Задание неактивно");

    // Автопроверка: дедлайн
    if (ad.submissionDeadline && new Date(ad.submissionDeadline) < new Date()) {
      return badRequest("Дедлайн подачи видео истёк");
    }

    // Автопроверка: минимум просмотров
    if (ad.minViews && claimedViews < ad.minViews) {
      return badRequest(`Минимум ${ad.minViews.toLocaleString()} просмотров для подачи`);
    }

    // Проверяем что креатор взял задание
    const application = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId: userId } },
      select: {
        id: true,
        contentStatus: true,
        submission: { select: { id: true } },
      },
    });

    if (!application) return badRequest("Сначала откликнитесь на задание");
    if (application.submission) return badRequest("Вы уже подавали скриншот статистики по этому заданию");

    // Проверяем что контент одобрен заказчиком
    if (application.contentStatus !== "content_approved") {
      const statusMessages: Record<string, string> = {
        pending_video: "Сначала прикрепите ссылку на видео",
        video_timed_out: "Время на прикрепление видео истекло",
        pending_review: "Ожидайте одобрения видео заказчиком",
        content_rejected: "Заказчик отклонил ваше видео",
      };
      return badRequest(statusMessages[application.contentStatus] ?? "Видео ещё не одобрено заказчиком");
    }

    // Проверяем дубликат видео (от любого креатора)
    const duplicateVideo = await prisma.videoSubmission.findFirst({
      where: { adId, videoUrl },
    });
    if (duplicateVideo) return badRequest("Это видео уже было подано на данное задание");

    // Рассчитываем ожидаемую выплату
    const rpm = ad.rpm ?? 0;
    let effectiveViews = claimedViews;
    if (ad.maxViewsPerCreator && effectiveViews > ad.maxViewsPerCreator) {
      effectiveViews = ad.maxViewsPerCreator;
    }
    const expectedGross = (effectiveViews / 1000) * rpm;

    // Атомарное резервирование бюджета
    const slaDeadline = new Date(Date.now() + MODERATION_SLA_HOURS * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submission = await prisma.$transaction(async (tx: any) => {
      const escrow = await tx.escrowAccount.findUnique({
        where: { adId },
      });

      if (!escrow || escrow.status !== "active") {
        throw new Error("ESCROW_UNAVAILABLE");
      }

      if (escrow.available <= 0) {
        throw new Error("BUDGET_EXHAUSTED");
      }

      // Резервируем сколько можем
      const reservedAmount = Math.min(expectedGross, escrow.available);

      await tx.escrowAccount.update({
        where: { adId },
        data: {
          reservedAmount: { increment: reservedAmount },
          available: { decrement: reservedAmount },
        },
      });

      // Создаём подачу
      const sub = await tx.videoSubmission.create({
        data: {
          applicationId: application.id,
          adId,
          creatorId: userId,
          videoUrl,
          screenshotUrl,
          claimedViews,
          reservedAmount,
          status: "submitted",
          slaDeadline,
        },
      });

      return sub;
    });

    // Рассчитываем preview для ответа
    const commission = expectedGross * PLATFORM_COMMISSION_RATE;
    const payout = expectedGross - commission;

    return NextResponse.json({
      submission,
      preview: {
        effectiveViews,
        grossAmount: expectedGross,
        commissionAmount: commission,
        payoutAmount: payout,
        reservedAmount: submission.reservedAmount,
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "ESCROW_UNAVAILABLE") return badRequest("Эскроу-счёт недоступен");
      if (err.message === "BUDGET_EXHAUSTED") return badRequest("Бюджет задания исчерпан");
    }
    console.error("[POST /api/tasks/[id]/submissions]", err);
    return serverError();
  }
}

/**
 * GET /api/tasks/[id]/submissions — Список подач по заданию.
 * Доступно: владелец задания, админ.
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
      select: { ownerId: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (ad?.ownerId !== userId && user?.role !== "admin") {
      return badRequest("Нет доступа");
    }

    const submissions = await prisma.videoSubmission.findMany({
      where: { adId },
      orderBy: { submittedAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        appeal: true,
      },
    });

    return NextResponse.json({ data: submissions });
  } catch (err) {
    console.error("[GET /api/tasks/[id]/submissions]", err);
    return serverError();
  }
}
