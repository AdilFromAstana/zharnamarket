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
import { CREATOR_PUBLICATION_PRICE } from "@/lib/constants";
import { validatePromoCode, applyPromoCode } from "@/lib/promo";
import { getPaymentProvider, isPaymentMock } from "@/lib/payment-client";

// POST /api/payments/creators/[id]/publish — оплатить публикацию профиля креатора
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: profileId } = await params;
    const body = await req.json();
    const { method, promoCode: promoCodeStr } = body as {
      method?: string;
      promoCode?: string;
    };

    if (!method) return badRequest("Способ оплаты обязателен");

    // Проверяем профиль
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) return notFound("Профиль не найден");
    if (profile.userId !== userId) return forbidden();
    if (profile.isPublished) {
      return badRequest("Профиль уже опубликован");
    }

    // Валидация промокода (если передан)
    let promoValidation: Awaited<ReturnType<typeof validatePromoCode>> | null =
      null;
    if (promoCodeStr?.trim()) {
      promoValidation = await validatePromoCode(
        promoCodeStr.trim(),
        "creator_publication",
        CREATOR_PUBLICATION_PRICE,
      );
      if (!promoValidation.valid) {
        return NextResponse.json(
          { error: promoValidation.message, reason: promoValidation.reason },
          { status: 400 },
        );
      }
    }

    const originalAmount = CREATOR_PUBLICATION_PRICE;
    const discountAmount = promoValidation?.valid
      ? promoValidation.discountAmount
      : 0;
    const finalAmount = promoValidation?.valid
      ? promoValidation.finalAmount
      : originalAmount;

    // Если скидка 100% — пропускаем платёжный шаг, сразу публикуем
    const isFree = finalAmount === 0;
    const publishedAt = new Date();

    // Всё в одной транзакции
    const result = await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        // Данные для создания платёжной сессии
        const paymentData: Record<string, unknown> = {
          userId,
          creatorProfileId: profileId,
          type: "creator_publication",
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
          await tx.creatorProfile.update({
            where: { id: profileId },
            data: { isPublished: true, publishedAt },
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
        profileStatus: "published",
        publishedAt: publishedAt.toISOString(),
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
      description: `Публикация профиля креатора: ${profile.title}`,
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
    console.error("[POST /api/payments/creators/[id]/publish]", err);
    return serverError();
  }
}
