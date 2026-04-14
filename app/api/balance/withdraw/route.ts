import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/constants";
import { VALID_PAYMENT_METHODS } from "@/lib/validation";

/**
 * POST /api/balance/withdraw — Запрос на вывод средств.
 *
 * Деньги списываются с внутреннего баланса и переводятся
 * на карту/Kaspi автоматически через платёжного провайдера.
 * Статус сразу "processing" — без ручного одобрения админом.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { amount, method, details } = body;

    if (!amount || typeof amount !== "number" || amount < MIN_WITHDRAWAL_AMOUNT) {
      return badRequest(`Минимальная сумма вывода: ${MIN_WITHDRAWAL_AMOUNT} ₸`);
    }
    if (!method || !VALID_PAYMENT_METHODS.has(method)) {
      return badRequest("Выберите способ вывода: kaspi, halyk, card");
    }
    if (!details || typeof details !== "string" || !details.trim()) {
      return badRequest("Укажите реквизиты (номер карты/телефона)");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withdrawal = await prisma.$transaction(async (tx: any) => {
      const balance = await tx.creatorBalance.findUnique({
        where: { userId },
      });

      if (!balance) return null;
      if (balance.balance < amount) return null;

      // Списать с баланса
      await tx.creatorBalance.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          totalWithdrawn: { increment: amount },
        },
      });

      // Создать запрос на вывод (processing = автообработка провайдером)
      const wr = await tx.withdrawalRequest.create({
        data: {
          balanceId: balance.id,
          userId,
          amount,
          method: method as "kaspi" | "halyk" | "card",
          details: details.trim(),
          status: "processing",
        },
      });

      // Записать транзакцию
      await tx.balanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: "withdrawal",
          amount: -amount,
          description: `Вывод ${amount.toLocaleString()} ₸ на ${method}`,
          withdrawalId: wr.id,
        },
      });

      return wr;
    });

    if (!withdrawal) {
      return badRequest("Недостаточно средств на балансе");
    }

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (err) {
    console.error("[POST /api/balance/withdraw]", err);
    return serverError();
  }
}
