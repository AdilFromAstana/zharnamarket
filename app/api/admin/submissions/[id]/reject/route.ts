import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  REJECTION_REASON_LABELS,
  PERMANENT_REJECTION_REASONS,
  type RejectionReason,
} from "@/lib/types/submission";
import { sendSubmissionRejectedEmail } from "@/lib/email";

const VALID_REASONS = new Set([
  "no_brand", "no_banner", "fake_stats", "boosted_views",
  "wrong_hashtags", "video_unavailable", "other",
]);

/**
 * POST /api/admin/submissions/[id]/reject — Отклонить подачу видео.
 * Возвращает зарезервированную сумму в эскроу.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "admin") return unauthorized();

    const { id: submissionId } = await params;
    const body = await req.json();
    const { reason, comment } = body;

    if (!reason || !VALID_REASONS.has(reason)) {
      return badRequest("Укажите причину отклонения");
    }
    if (reason === "other" && (!comment || typeof comment !== "string" || !comment.trim())) {
      return badRequest("Для причины 'Другое' необходим комментарий");
    }

    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: { ad: { select: { title: true } } },
    });

    if (!submission) return badRequest("Подача не найдена");
    if (submission.status !== "submitted") return badRequest("Подача уже обработана");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // 1. Вернуть резерв в эскроу
      const reserved = submission.reservedAmount ?? 0;
      if (reserved > 0) {
        await tx.escrowAccount.update({
          where: { adId: submission.adId },
          data: {
            reservedAmount: { decrement: reserved },
            available: { increment: reserved },
          },
        });
      }

      // 2. Обновить подачу
      await tx.videoSubmission.update({
        where: { id: submissionId },
        data: {
          status: "rejected",
          rejectionReason: reason,
          rejectionComment: comment?.trim() ?? null,
          moderatorId: userId,
          moderatedAt: new Date(),
        },
      });
    });

    // Уведомление креатору. Fire-and-forget.
    (async () => {
      const creator = await prisma.user.findUnique({
        where: { id: submission.creatorId },
        select: { email: true },
      });
      if (!creator?.email) return;
      const typedReason = reason as RejectionReason;
      await sendSubmissionRejectedEmail(creator.email, {
        taskTitle: submission.ad.title,
        reasonLabel: REJECTION_REASON_LABELS[typedReason] ?? reason,
        comment: comment?.trim() ?? null,
        canAppeal: !PERMANENT_REJECTION_REASONS.includes(typedReason),
        submissionId: submission.id,
      });
    })().catch((err) => {
      console.error("[reject] creator email failed:", err);
    });

    return NextResponse.json({ ok: true, reason });
  } catch (err) {
    console.error("[POST /api/admin/submissions/[id]/reject]", err);
    return serverError();
  }
}
