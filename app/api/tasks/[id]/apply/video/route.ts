import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidUrl } from "@/lib/validation";

const CONTENT_REVIEW_HOURS = 72;

/**
 * POST /api/tasks/[id]/apply/video — Креатор прикрепляет ссылку на видео.
 * Переводит заявку из pending_video → pending_review.
 * Устанавливает contentReviewDeadline = now + 72h.
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
    const { videoUrl } = body;

    if (!videoUrl || !isValidUrl(videoUrl)) {
      return badRequest("Укажите корректную ссылку на видео");
    }

    // Находим заявку
    const application = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId: userId } },
    });

    if (!application) return badRequest("Вы не откликались на это задание");

    // Lazy-check: истёк ли 48h дедлайн
    if (
      application.contentStatus === "pending_video" &&
      application.videoDeadline &&
      new Date() > application.videoDeadline
    ) {
      await prisma.taskApplication.update({
        where: { id: application.id },
        data: { contentStatus: "video_timed_out" },
      });
      return badRequest("Время на прикрепление видео истекло (48ч). Подайте заявку заново.");
    }

    if (application.contentStatus !== "pending_video") {
      return badRequest(`Неверный статус заявки: ${application.contentStatus}`);
    }

    // Проверяем дубликат видео по этому заданию
    const duplicate = await prisma.taskApplication.findFirst({
      where: { adId, videoUrl },
    });
    if (duplicate) return badRequest("Эта ссылка на видео уже используется в другой заявке");

    const contentReviewDeadline = new Date(Date.now() + CONTENT_REVIEW_HOURS * 60 * 60 * 1000);
    const now = new Date();

    const updated = await prisma.taskApplication.update({
      where: { id: application.id },
      data: {
        videoUrl,
        videoSubmittedAt: now,
        contentReviewDeadline,
        contentStatus: "pending_review",
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[POST /api/tasks/[id]/apply/video]", err);
    return serverError();
  }
}
