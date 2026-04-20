import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import { sendSubmissionApprovedEmail } from "@/lib/email";

/**
 * POST /api/admin/submissions/[id]/approve — Одобрить подачу видео.
 * Атомарная транзакция: эскроу → комиссия + баланс креатора.
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
    const { approvedViews } = body;

    if (!approvedViews || typeof approvedViews !== "number" || approvedViews < 1) {
      return badRequest("Укажите засчитанные просмотры");
    }

    // Загружаем подачу
    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: { ad: { select: { rpm: true, maxViewsPerCreator: true, title: true } } },
    });

    if (!submission) return badRequest("Подача не найдена");
    if (submission.status !== "submitted") return badRequest("Подача уже обработана");

    const rpm = submission.ad.rpm ?? 0;
    let effectiveViews = approvedViews;
    if (submission.ad.maxViewsPerCreator && effectiveViews > submission.ad.maxViewsPerCreator) {
      effectiveViews = submission.ad.maxViewsPerCreator;
    }

    const grossAmount = (effectiveViews / 1000) * rpm;
    const commissionAmount = grossAmount * PLATFORM_COMMISSION_RATE;
    const payoutAmount = grossAmount - commissionAmount;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // 1. Обновить эскроу: unreserve + spend
      const escrow = await tx.escrowAccount.findUnique({
        where: { adId: submission.adId },
      });

      if (!escrow) throw new Error("ESCROW_NOT_FOUND");

      const reserved = submission.reservedAmount ?? 0;
      // Фактическое списание может отличаться от резерва
      const actualSpend = Math.min(grossAmount, reserved + escrow.available);

      await tx.escrowAccount.update({
        where: { adId: submission.adId },
        data: {
          reservedAmount: { decrement: reserved },
          spentAmount: { increment: actualSpend },
          available: escrow.available + reserved - actualSpend > 0
            ? { increment: reserved - actualSpend }
            : { set: Math.max(0, escrow.available + reserved - actualSpend) },
        },
      });

      // Пересчитываем available для проверки исчерпания
      const updatedEscrow = await tx.escrowAccount.findUnique({
        where: { adId: submission.adId },
        select: { available: true, reservedAmount: true },
      });

      // 2. Зачислить на баланс креатора
      const balance = await tx.creatorBalance.upsert({
        where: { userId: submission.creatorId },
        create: {
          userId: submission.creatorId,
          balance: payoutAmount,
          totalEarned: payoutAmount,
        },
        update: {
          balance: { increment: payoutAmount },
          totalEarned: { increment: payoutAmount },
        },
      });

      // 3. Записать транзакцию
      await tx.balanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: "earning",
          amount: payoutAmount,
          description: `Задание «${submission.ad.title}» — ${effectiveViews.toLocaleString()} просмотров`,
          submissionId: submission.id,
        },
      });

      // 4. Обновить подачу
      await tx.videoSubmission.update({
        where: { id: submissionId },
        data: {
          status: "approved",
          approvedViews: effectiveViews,
          payoutAmount,
          commissionAmount,
          grossAmount: actualSpend,
          moderatorId: userId,
          moderatedAt: new Date(),
        },
      });

      // 5. Проверить исчерпание бюджета
      if (updatedEscrow && updatedEscrow.available <= 0 && updatedEscrow.reservedAmount <= 0) {
        await tx.ad.update({
          where: { id: submission.adId },
          data: { status: "budget_exhausted" },
        });
        await tx.escrowAccount.update({
          where: { adId: submission.adId },
          data: { status: "exhausted" },
        });
      }
    });

    // Уведомление креатору. Fire-and-forget.
    (async () => {
      const creator = await prisma.user.findUnique({
        where: { id: submission.creatorId },
        select: { email: true },
      });
      if (!creator?.email) return;
      await sendSubmissionApprovedEmail(creator.email, {
        taskTitle: submission.ad.title,
        approvedViews: effectiveViews,
        payoutAmount,
      });
    })().catch((err) => {
      console.error("[approve] creator email failed:", err);
    });

    return NextResponse.json({
      ok: true,
      approvedViews: effectiveViews,
      grossAmount,
      commissionAmount,
      payoutAmount,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ESCROW_NOT_FOUND") {
      return badRequest("Эскроу-счёт не найден");
    }
    console.error("[POST /api/admin/submissions/[id]/approve]", err);
    return serverError();
  }
}
