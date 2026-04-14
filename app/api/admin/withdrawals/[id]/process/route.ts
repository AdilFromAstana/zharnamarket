import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/withdrawals/[id]/process
 *
 * Вызывается платёжным провайдером (webhook) или внутренней системой
 * для обновления статуса вывода.
 *
 * Body: { action: "complete" | "fail" }
 *
 * - complete: перевод успешно выполнен провайдером
 * - fail: ошибка провайдера → средства возвращаются на баланс
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

    const { id: withdrawalId } = await params;
    const body = await req.json();
    const { action } = body;

    if (!action || (action !== "complete" && action !== "fail")) {
      return badRequest("Укажите действие: complete или fail");
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) return badRequest("Запрос не найден");
    if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
      return badRequest("Запрос уже обработан");
    }

    if (action === "complete") {
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: "completed", processedAt: new Date() },
      });
    } else {
      // Возвращаем деньги на баланс при ошибке провайдера
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.$transaction(async (tx: any) => {
        await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: { status: "failed", processedAt: new Date() },
        });

        await tx.creatorBalance.update({
          where: { userId: withdrawal.userId },
          data: {
            balance: { increment: withdrawal.amount },
            totalWithdrawn: { decrement: withdrawal.amount },
          },
        });

        const balance = await tx.creatorBalance.findUnique({
          where: { userId: withdrawal.userId },
        });

        await tx.balanceTransaction.create({
          data: {
            balanceId: balance.id,
            type: "refund",
            amount: withdrawal.amount,
            description: `Возврат: ошибка провайдера при выводе ${withdrawal.amount.toLocaleString()} ₸`,
            withdrawalId: withdrawal.id,
          },
        });
      });
    }

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    console.error("[POST /api/admin/withdrawals/[id]/process]", err);
    return serverError();
  }
}
