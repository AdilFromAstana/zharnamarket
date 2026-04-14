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
import { CREATOR_BOOST_OPTIONS } from "@/lib/constants";
import { validatePromoCode, applyPromoCode } from "@/lib/promo";
import { getPaymentProvider, isPaymentMock } from "@/lib/payment-client";
import type { BoostType } from "@prisma/client";

// POST /api/payments/creators/[id]/boost — оплатить буст профиля креатора
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: profileId } = await params;
    const body = await req.json();
    const {
      boostType,
      method,
      promoCode: promoCodeStr,
    } = body as {
      boostType?: string;
      method?: string;
      promoCode?: string;
    };

    if (!boostType) return badRequest("Тип буста обязателен");
    if (!method) return badRequest("Способ оплаты обязателен");

    const isWallet = method === "wallet";
    if (!isWallet && !["kaspi", "halyk", "card"].includes(method)) {
      return badRequest("Способ оплаты: kaspi, halyk, card или wallet");
    }

    const boostOption = CREATOR_BOOST_OPTIONS.find((b) => b.id === boostType);
    if (!boostOption) return badRequest("Неверный тип буста");

    const profile = await prisma.creatorProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) return notFound("Профиль не найден");
    if (profile.userId !== userId) return forbidden();
    if (!profile.isPublished) {
      return badRequest("Профиль должен быть опубликован для продвижения");
    }

    // Валидация промокода (если передан)
    let promoValidation: Awaited<ReturnType<typeof validatePromoCode>> | null =
      null;
    if (promoCodeStr?.trim()) {
      promoValidation = await validatePromoCode(
        promoCodeStr.trim(),
        "creator_boost",
        boostOption.price,
      );
      if (!promoValidation.valid) {
        return NextResponse.json(
          { error: promoValidation.message, reason: promoValidation.reason },
          { status: 400 },
        );
      }
    }

    const originalAmount = boostOption.price;
    const discountAmount = promoValidation?.valid
      ? promoValidation.discountAmount
      : 0;
    const finalAmount = promoValidation?.valid
      ? promoValidation.finalAmount
      : originalAmount;

    // Если скидка 100% — пропускаем платёжный шаг, сразу активируем
    const isFree = finalAmount === 0;

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + boostOption.days * 24 * 60 * 60 * 1000,
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
          await tx.creatorBalance.update({
            where: { userId },
            data: {
              balance: { decrement: finalAmount },
              totalSpent: { increment: finalAmount },
            },
          });

          await tx.balanceTransaction.create({
            data: {
              balanceId: wallet!.id,
              type: "boost",
              amount: -finalAmount,
              description: `Буст «${boostOption.name}» профиля: ${profile.title}`,
            },
          });

          const paymentData: Record<string, unknown> = {
            userId,
            creatorProfileId: profileId,
            type: "creator_boost",
            amount: finalAmount,
            method: "wallet",
            status: "success",
            boostType: boostType as "rise" | "vip" | "premium",
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

          await tx.creatorBoost.create({
            data: {
              creatorProfileId: profileId,
              boostType: boostType as BoostType,
              activatedAt: now,
              expiresAt,
            },
          });

          await tx.creatorProfile.update({
            where: { id: profileId },
            data: { raisedAt: now },
          });

          return payment;
        },
      );

      return NextResponse.json({
        paymentId: result.id,
        status: "success",
        boostType,
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        originalAmount,
        discountAmount,
        finalAmount,
        isFree: false,
        fromWallet: true,
        promoApplied: !!promoValidation?.valid,
      });
    }

    // ── Ветка: внешняя оплата или бесплатно ──────────────────────
    const result = await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        const paymentData: Record<string, unknown> = {
          userId,
          creatorProfileId: profileId,
          type: "creator_boost",
          amount: finalAmount,
          method: method as "kaspi" | "halyk" | "card",
          status: isFree ? "success" : "pending",
          boostType: boostType as "rise" | "vip" | "premium",
        };

        if (promoValidation?.valid) {
          paymentData.originalAmount = originalAmount;
          paymentData.discountAmount = discountAmount;
          paymentData.promoCodeId = promoValidation.promoCodeId;
        }

        const payment = await tx.paymentSession.create({
          data: paymentData,
        });

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
          await tx.creatorBoost.create({
            data: {
              creatorProfileId: profileId,
              boostType: boostType as BoostType,
              activatedAt: now,
              expiresAt,
            },
          });

          await tx.creatorProfile.update({
            where: { id: profileId },
            data: { raisedAt: now },
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
        boostType,
        activatedAt: now.toISOString(),
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

    const boostLabel = boostOption.name;
    const { paymentUrl, externalId } = await provider.initPayment({
      amount: finalAmount,
      description: `Буст «${boostLabel}» для профиля`,
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
      boostType,
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
    console.error("[POST /api/payments/creators/[id]/boost]", err);
    return serverError();
  }
}
