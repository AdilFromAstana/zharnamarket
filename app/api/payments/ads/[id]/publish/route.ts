import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  badRequest,
  notFound,
  forbidden,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PUBLICATION_PRICE, PUBLICATION_DAYS } from "@/lib/constants";
import { validatePromoCode, applyPromoCode } from "@/lib/promo";
import { getPaymentProvider, isPaymentMock } from "@/lib/payment-client";

// POST /api/payments/ads/[id]/publish — оплатить публикацию объявления
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;
    const body = await req.json();
    const { method, promoCode: promoCodeStr } = body as {
      method?: string;
      promoCode?: string;
    };

    if (!method) return badRequest("Способ оплаты обязателен");

    const isWallet = method === "wallet";
    if (!isWallet && !["kaspi", "halyk", "card"].includes(method)) {
      return badRequest("Способ оплаты: kaspi, halyk, card или wallet");
    }

    const ad = await prisma.ad.findFirst({
      where: { id: adId, deletedAt: null },
    });
    if (!ad) return notFound("Объявление не найдено");
    if (ad.ownerId !== userId) return forbidden();

    // Валидация промокода (если передан)
    let promoValidation: Awaited<ReturnType<typeof validatePromoCode>> | null =
      null;
    if (promoCodeStr?.trim()) {
      promoValidation = await validatePromoCode(
        promoCodeStr.trim(),
        "ad_publication",
        PUBLICATION_PRICE,
      );
      if (!promoValidation.valid) {
        return NextResponse.json(
          { error: promoValidation.message, reason: promoValidation.reason },
          { status: 400 },
        );
      }
    }

    const originalAmount = PUBLICATION_PRICE;
    const discountAmount = promoValidation?.valid
      ? promoValidation.discountAmount
      : 0;
    const finalAmount = promoValidation?.valid
      ? promoValidation.finalAmount
      : originalAmount;

    // Если скидка 100% или оплата из кошелька — пропускаем редирект к провайдеру
    const isFree = finalAmount === 0;

    const publishedAt = new Date();
    const expiresAt = new Date(
      publishedAt.getTime() + PUBLICATION_DAYS * 24 * 60 * 60 * 1000,
    );

    // ── Ветка: оплата из кошелька ──────────────────────────────
    if (isWallet && !isFree) {
      const wallet = await prisma.creatorBalance.findUnique({
        where: { userId },
        select: { id: true, balance: true },
      });

      const available = wallet?.balance ?? 0;
      if (available < finalAmount) {
        return NextResponse.json(
          {
            error: "Недостаточно средств на кошельке",
            required: finalAmount,
            available,
            shortfall: finalAmount - available,
          },
          { status: 400 },
        );
      }

      const result = await prisma.$transaction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (tx: any) => {
          // Списываем из кошелька
          await tx.creatorBalance.update({
            where: { userId },
            data: {
              balance: { decrement: finalAmount },
              totalSpent: { increment: finalAmount },
            },
          });

          // Запись транзакции
          await tx.balanceTransaction.create({
            data: {
              balanceId: wallet!.id,
              type: "ad_publication",
              amount: -finalAmount,
              description: `Публикация объявления: ${ad.title}`,
              adId,
            },
          });

          // Создаём сессию как success (для истории)
          const paymentData: Record<string, unknown> = {
            userId,
            adId,
            type: "ad_publication",
            amount: finalAmount,
            method: "wallet",
            status: "success",
          };
          if (promoValidation?.valid) {
            paymentData.originalAmount = originalAmount;
            paymentData.discountAmount = discountAmount;
            paymentData.promoCodeId = promoValidation.promoCodeId;
          }
          const payment = await tx.paymentSession.create({ data: paymentData });

          if (promoValidation?.valid) {
            await applyPromoCode(
              tx,
              promoValidation.promoCodeId,
              payment.id,
              userId,
              originalAmount,
              discountAmount,
              finalAmount,
            );
          }

          // Активируем объявление
          await tx.ad.update({
            where: { id: adId },
            data: { status: "active", publishedAt, expiresAt, raisedAt: publishedAt },
          });

          return payment;
        },
      );

      return NextResponse.json({
        paymentId: result.id,
        status: "success",
        adStatus: "active",
        publishedAt: publishedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        originalAmount,
        discountAmount,
        finalAmount,
        isFree: false,
        fromWallet: true,
        promoApplied: !!promoValidation?.valid,
      });
    }

    // Всё в одной транзакции
    const result = await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        // Данные для создания платёжной сессии
        const paymentData: Record<string, unknown> = {
          userId,
          adId,
          type: "ad_publication",
          amount: finalAmount,
          method: method as "kaspi" | "halyk" | "card",
          status: isFree ? "success" : "pending",
        };

        // Добавляем поля скидки только если был промокод
        if (promoValidation?.valid) {
          paymentData.originalAmount = originalAmount;
          paymentData.discountAmount = discountAmount;
          paymentData.promoCodeId = promoValidation.promoCodeId;
        }

        // Создаём платёжную сессию
        const payment = await tx.paymentSession.create({
          data: paymentData,
        });

        // Применяем промокод (если был)
        if (promoValidation?.valid) {
          await applyPromoCode(
            tx,
            promoValidation.promoCodeId,
            payment.id,
            userId,
            originalAmount,
            discountAmount,
            finalAmount,
          );
        }

        if (isFree) {
          // Скидка 100% — сразу публикуем без платёжного провайдера
          await tx.ad.update({
            where: { id: adId },
            data: { status: "active", publishedAt, expiresAt },
          });
        }

        return payment;
      },
    );

    // Если бесплатно — сразу возвращаем success
    if (isFree) {
      return NextResponse.json({
        paymentId: result.id,
        status: "success",
        adStatus: "active",
        publishedAt: publishedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        originalAmount,
        discountAmount,
        finalAmount,
        isFree: true,
        promoApplied: !!promoValidation?.valid,
      });
    }

    // Инициируем платёж через провайдера
    const provider = getPaymentProvider();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    const { paymentUrl, externalId } = await provider.initPayment({
      amount: finalAmount,
      description: `Публикация объявления: ${ad.title}`,
      orderId: result.id,
      method: method as "kaspi" | "halyk" | "card",
      userEmail: user?.email ?? "",
      userPhone: user?.phone ?? undefined,
    });

    // Сохраняем externalId провайдера
    await prisma.paymentSession.update({
      where: { id: result.id },
      data: { externalId },
    });

    return NextResponse.json({
      paymentId: result.id,
      paymentUrl,
      status: "pending",
      isMock: isPaymentMock(),
      originalAmount,
      discountAmount,
      finalAmount,
      isFree: false,
      promoApplied: !!promoValidation?.valid,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PROMO_LIMIT_REACHED") {
      return NextResponse.json(
        {
          error: "Промокод уже использован максимальное количество раз",
          reason: "limit_reached",
        },
        { status: 400 },
      );
    }
    console.error("[POST /api/payments/ads/[id]/publish]", err);
    return serverError();
  }
}
