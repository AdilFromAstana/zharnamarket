import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VIDEO_DEADLINE_HOURS = 48;

/**
 * POST /api/tasks/[id]/apply — Креатор откликается на escrow-задание.
 * Создаёт TaskApplication со статусом pending_video (или сбрасывает при reapply).
 * Устанавливает videoDeadline = now + 48h.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;

    // Проверяем задание
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        paymentMode: true,
        submissionDeadline: true,
      },
    });

    if (!ad) return badRequest("Задание не найдено");
    if (ad.paymentMode !== "escrow") return badRequest("Это задание не поддерживает подачу через платформу");
    if (ad.status !== "active") return badRequest("Задание неактивно");
    if (ad.ownerId === userId) return badRequest("Нельзя взять своё задание");
    if (ad.submissionDeadline && new Date(ad.submissionDeadline) < new Date()) {
      return badRequest("Дедлайн подачи истёк");
    }

    // Проверяем эскроу
    const escrow = await prisma.escrowAccount.findUnique({
      where: { adId },
      select: { available: true, status: true },
    });
    if (!escrow || escrow.status !== "active" || escrow.available <= 0) {
      return badRequest("Бюджет задания исчерпан");
    }

    const videoDeadline = new Date(Date.now() + VIDEO_DEADLINE_HOURS * 60 * 60 * 1000);

    // Проверяем существующую заявку
    const existing = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId: userId } },
    });

    if (existing) {
      // Reapply разрешён только после content_rejected
      if (existing.contentStatus === "content_rejected") {
        const application = await prisma.taskApplication.update({
          where: { id: existing.id },
          data: {
            contentStatus: "pending_video",
            videoDeadline,
            videoUrl: null,
            videoSubmittedAt: null,
            contentReviewDeadline: null,
            contentReviewedAt: null,
            contentRejectionNote: null,
          },
          include: {
            creator: { select: { id: true, name: true, avatar: true } },
          },
        });
        return NextResponse.json(application, { status: 200 });
      }
      return badRequest("Вы уже откликнулись на это задание");
    }

    const application = await prisma.taskApplication.create({
      data: {
        adId,
        creatorId: userId,
        contentStatus: "pending_video",
        videoDeadline,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks/[id]/apply]", err);
    return serverError();
  }
}

/**
 * GET /api/tasks/[id]/apply — Статус своей заявки на задание (с lazy-check дедлайнов).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return NextResponse.json({ application: null });

    const { id: adId } = await params;

    const application = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId: userId } },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
            claimedViews: true,
            approvedViews: true,
            rejectionReason: true,
            rejectionComment: true,
            reservedAmount: true,
            payoutAmount: true,
          },
        },
      },
    });

    if (!application) return NextResponse.json({ application: null });

    // Lazy-check дедлайнов
    const now = new Date();
    let updatedStatus = application.contentStatus;

    if (
      application.contentStatus === "pending_video" &&
      application.videoDeadline &&
      now > application.videoDeadline
    ) {
      updatedStatus = "video_timed_out";
    } else if (
      application.contentStatus === "pending_review" &&
      application.contentReviewDeadline &&
      now > application.contentReviewDeadline
    ) {
      updatedStatus = "content_approved";
    }

    if (updatedStatus !== application.contentStatus) {
      await prisma.taskApplication.update({
        where: { id: application.id },
        data: { contentStatus: updatedStatus },
      });
      application.contentStatus = updatedStatus;
    }

    return NextResponse.json({ application });
  } catch (err) {
    console.error("[GET /api/tasks/[id]/apply]", err);
    return serverError();
  }
}

/**
 * DELETE /api/tasks/[id]/apply — Креатор отказывается от задания.
 * Удаляет TaskApplication (только если нет подачи).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;

    const application = await prisma.taskApplication.findUnique({
      where: { adId_creatorId: { adId, creatorId: userId } },
      include: { submission: { select: { id: true } } },
    });

    if (!application) return badRequest("Вы не откликались на это задание");
    if (application.submission) {
      return badRequest("Нельзя отказаться после подачи видео");
    }

    await prisma.taskApplication.delete({
      where: { id: application.id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/tasks/[id]/apply]", err);
    return serverError();
  }
}
