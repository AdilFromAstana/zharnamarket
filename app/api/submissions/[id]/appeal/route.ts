import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APPEAL_DEADLINE_HOURS } from "@/lib/constants";
import { PERMANENT_REJECTION_REASONS } from "@/lib/types/submission";
import { sendAdminAppealEmail } from "@/lib/email";

/**
 * POST /api/submissions/[id]/appeal — Подать апелляцию на отклонённую подачу.
 * Доступно в течение 48ч после отклонения.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: submissionId } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return badRequest("Опишите причину апелляции (минимум 10 символов)");
    }
    if (reason.length > 500) return badRequest("Максимум 500 символов");

    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: { appeal: true },
    });

    if (!submission) return badRequest("Подача не найдена");
    if (submission.creatorId !== userId) return badRequest("Нет доступа");
    if (submission.status !== "rejected") return badRequest("Апелляция доступна только для отклонённых подач");
    if (submission.appeal) return badRequest("Апелляция уже подана");

    // Проверяем причину — для накрутки/фейка апелляция невозможна
    if (submission.rejectionReason && PERMANENT_REJECTION_REASONS.includes(submission.rejectionReason as typeof PERMANENT_REJECTION_REASONS[number])) {
      return badRequest("Апелляция недоступна для данной причины отклонения");
    }

    // Проверяем дедлайн (48ч после модерации)
    if (submission.moderatedAt) {
      const deadline = new Date(submission.moderatedAt.getTime() + APPEAL_DEADLINE_HOURS * 60 * 60 * 1000);
      if (new Date() > deadline) {
        return badRequest("Срок подачи апелляции истёк (48 часов)");
      }
    }

    const appealDeadline = new Date(Date.now() + APPEAL_DEADLINE_HOURS * 60 * 60 * 1000);

    const appeal = await prisma.appeal.create({
      data: {
        submissionId,
        creatorId: userId,
        reason: reason.trim(),
        status: "pending",
        deadline: appealDeadline,
      },
    });

    // Admin-алерт. Fire-and-forget.
    (async () => {
      const creator = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!creator?.email) return;
      await sendAdminAppealEmail({
        userEmail: creator.email,
        submissionId,
        appealId: appeal.id,
        reason: appeal.reason,
      });
    })().catch((err) => {
      console.error("[appeal] admin alert failed:", err);
    });

    return NextResponse.json(appeal, { status: 201 });
  } catch (err) {
    console.error("[POST /api/submissions/[id]/appeal]", err);
    return serverError();
  }
}
