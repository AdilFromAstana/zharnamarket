import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getProviderForMethod,
  type PaymentMethodId,
} from "@/lib/payment-providers";
import { paymentLimiter, rateLimitGuard } from "@/lib/rate-limit";

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

    const limited = rateLimitGuard(paymentLimiter, `payment:${userId}`, 600);
    if (limited) return limited;

    const body = await req.json();
    const { amount, method } = body as { amount?: number; method?: string };

    if (!amount || typeof amount !== "number" || amount < MIN_TOPUP_AMOUNT) {
      return badRequest(`Минимальная сумма пополнения: ${MIN_TOPUP_AMOUNT} ₸`);
    }

    if (!method) return badRequest("Способ оплаты обязателен");
    const providerEntry = getProviderForMethod(method as PaymentMethodId);
    if (!providerEntry) {
      return badRequest("Способ оплаты недоступен");
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
        method: method as PaymentMethodId,
        status: "pending",
      },
    });

    // Инициируем платёж через провайдера
    const { paymentUrl, externalId } = await providerEntry.provider.initPayment({
      amount,
      description: `Пополнение кошелька: ${user.name}`,
      orderId: session.id,
      method: method as PaymentMethodId,
      userEmail: user.email ?? "",
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
      isMock: providerEntry.providerId === "mock",
    });
  } catch (err) {
    console.error("[POST /api/payments/wallet/topup]", err);
    return serverError();
  }
}
