import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, isPaymentMock } from "@/lib/payment-client";
import { VALID_PAYMENT_METHODS } from "@/lib/validation";

const MIN_TOPUP_AMOUNT = 100; // ₸

/**
 * POST /api/payments/wallet/topup — Пополнение кошелька через платёжного провайдера.
 *
 * После успешной оплаты webhook зачисляет сумму на CreatorBalance (единый кошелёк).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { amount, method } = body as { amount?: number; method?: string };

    if (!amount || typeof amount !== "number" || amount < MIN_TOPUP_AMOUNT) {
      return badRequest(`Минимальная сумма пополнения: ${MIN_TOPUP_AMOUNT} ₸`);
    }

    if (!method || !VALID_PAYMENT_METHODS.has(method)) {
      return badRequest("Выберите способ оплаты: kaspi, halyk, card");
    }

    // Получаем данные пользователя для провайдера
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, name: true },
    });
    if (!user) return badRequest("Пользователь не найден");

    // Создаём платёжную сессию
    const session = await prisma.paymentSession.create({
      data: {
        userId,
        type: "wallet_topup",
        amount,
        method: method as "kaspi" | "halyk" | "card",
        status: "pending",
      },
    });

    // Инициируем платёж через провайдера
    const provider = getPaymentProvider();
    const { paymentUrl, externalId } = await provider.initPayment({
      amount,
      description: `Пополнение кошелька: ${user.name}`,
      orderId: session.id,
      method: method as "kaspi" | "halyk" | "card",
      userEmail: user.email,
      userPhone: user.phone ?? undefined,
    });

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: { externalId },
    });

    return NextResponse.json({
      sessionId: session.id,
      paymentUrl,
      amount,
      isMock: isPaymentMock(),
    });
  } catch (err) {
    console.error("[POST /api/payments/wallet/topup]", err);
    return serverError();
  }
}
