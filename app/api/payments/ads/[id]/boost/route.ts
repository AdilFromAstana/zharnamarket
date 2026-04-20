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
import { BOOST_OPTIONS, BOOST_LABELS } from "@/lib/constants";
import { validatePromoCode, applyPromoCode } from "@/lib/promo";
import { getProviderForMethod, type PaymentMethodId } from "@/lib/payment-providers";
import { paymentLimiter, rateLimitGuard } from "@/lib/rate-limit";
import { RAISE_PRIORITY, computeProRatedDiscount } from "@/lib/boost";
import type { BoostType } from "@prisma/client";

// POST /api/payments/ads/[id]/boost — оплатить буст объявления
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const limited = rateLimitGuard(paymentLimiter, `payment:${userId}`, 600);
    if (limited) return limited;

    const { id: adId } = await params;
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
    const providerEntry = isWallet
      ? null
      : getProviderForMethod(method as PaymentMethodId);
    if (!isWallet && !providerEntry) {
      return badRequest("Способ оплаты недоступен");
    }

    const boostOption = BOOST_OPTIONS.find((b) => b.id === boostType);
    if (!boostOption) return badRequest("Неверный тип буста");

    const ad = await prisma.ad.findFirst({
      where: { id: adId, deletedAt: null },
    });
    if (!ad) return notFound("Объявление не найдено");
    if (ad.ownerId !== userId) return forbidden();

    // Объявление должно быть активным и не истёкшим
    if (ad.status !== "active") {
      return badRequest(
        "Объявление не активно — сначала продлите или возобновите публикацию",
      );
    }
    if (ad.expiresAt && ad.expiresAt < new Date()) {
      return badRequest(
        "Срок публикации объявления истёк — сначала продлите публикацию",
      );
    }

    // Активные бусты: same-tier разрешаем (renewal), higher-tier блокирует
    const newBoostPriority = RAISE_PRIORITY[boostType as BoostType];
    const activeBoosts = await prisma.adBoost.findMany({
      where: {
        adId,
        expiresAt: { gte: new Date() },
      },
      select: { id: true, boostType: true, expiresAt: true },
    });
    const blockingBoost = activeBoosts.find(
      (b) => RAISE_PRIORITY[b.boostType] > newBoostPriority,
    );
    if (blockingBoost) {
      return NextResponse.json(
        {
          error: `У объявления уже активен более высокий буст «${BOOST_LABELS[blockingBoost.boostType]}». Тариф ниже недоступен до окончания.`,
          reason: "active_higher_boost_exists",
          activeBoost: {
            boostType: blockingBoost.boostType,
            expiresAt: blockingBoost.expiresAt.toISOString(),
          },
        },
        { status: 409 },
      );
    }

    // Same-tier = продление: добавляем days к существующему expiresAt
    const sameTierBoost = activeBoosts.find(
      (b) => b.boostType === boostType,
    );

    // Апгрейд: активный младший тир → будет заменён новым, остаток идёт в скидку
    const lowerTierBoost = activeBoosts.find(
      (b) =>
        b.boostType !== boostType &&
        RAISE_PRIORITY[b.boostType] < newBoostPriority,
    );

    // Валидация промокода (если передан)
    let promoValidation: Awaited<ReturnType<typeof validatePromoCode>> | null =
      null;
    if (promoCodeStr?.trim()) {
      promoValidation = await validatePromoCode(
        promoCodeStr.trim(),
        "ad_boost",
        boostOption.price,
      );
      if (!promoValidation.valid) {
        return NextResponse.json(
          { error: promoValidation.message, reason: promoValidation.reason },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const daysMs = boostOption.days * 24 * 60 * 60 * 1000;

    // Pro-rated скидка за остаток младшего тира при апгрейде
    const proRatedDiscount = computeProRatedDiscount(
      lowerTierBoost,
      boostOption,
      BOOST_OPTIONS,
      now,
    );

    const originalAmount = boostOption.price;
    const promoDiscount = promoValidation?.valid
      ? promoValidation.discountAmount
      : 0;
    const discountAmount = promoDiscount + proRatedDiscount;
    const finalAmount = Math.max(0, originalAmount - discountAmount);

    // Если скидка 100% (промокод 100% ИЛИ pro-rated покрывает всё) — активируем без провайдера
    const isFree = finalAmount === 0;

    // Для продления (same-tier) — продлеваем от существующего конца, чтобы не терять оставшееся время
    const expiresAt = sameTierBoost
      ? new Date(sameTierBoost.expiresAt.getTime() + daysMs)
      : new Date(now.getTime() + daysMs);

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
              description: `Буст «${boostOption.name}»: ${ad.title}`,
              adId,
            },
          });

          const paymentData: Record<string, unknown> = {
            userId,
            adId,
            type: "ad_boost",
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

          if (sameTierBoost) {
            await tx.adBoost.update({
              where: { id: sameTierBoost.id },
              data: { expiresAt },
            });
          } else {
            // Апгрейд: завершаем младший тир сейчас (pro-rated уже ушёл в скидку)
            if (lowerTierBoost) {
              await tx.adBoost.update({
                where: { id: lowerTierBoost.id },
                data: { expiresAt: now },
              });
            }
            await tx.adBoost.create({
              data: {
                adId,
                boostType: boostType as BoostType,
                activatedAt: now,
                expiresAt,
              },
            });
          }

          await tx.ad.update({
            where: { id: adId },
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
        proRatedDiscount,
        finalAmount,
        isFree: false,
        fromWallet: true,
        renewed: !!sameTierBoost,
        upgraded: !!lowerTierBoost,
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
          type: "ad_boost",
          amount: finalAmount,
          method: method as PaymentMethodId,
          status: isFree ? "success" : "pending",
          boostType: boostType as "rise" | "vip" | "premium",
        };

        // Добавляем поля скидки только если был промокод
        if (promoValidation?.valid) {
          paymentData.originalAmount = originalAmount;
          paymentData.discountAmount = discountAmount;
          paymentData.promoCodeId = promoValidation.promoCodeId;
        }

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
          // Скидка 100% — сразу активируем буст без платёжного провайдера
          if (sameTierBoost) {
            await tx.adBoost.update({
              where: { id: sameTierBoost.id },
              data: { expiresAt },
            });
          } else {
            if (lowerTierBoost) {
              await tx.adBoost.update({
                where: { id: lowerTierBoost.id },
                data: { expiresAt: now },
              });
            }
            await tx.adBoost.create({
              data: {
                adId,
                boostType: boostType as BoostType,
                activatedAt: now,
                expiresAt,
              },
            });
          }

          // Немедленно поднимаем объявление в ленте
          await tx.ad.update({
            where: { id: adId },
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
        proRatedDiscount,
        finalAmount,
        isFree: true,
        renewed: !!sameTierBoost,
        upgraded: !!lowerTierBoost,
        promoApplied: !!promoValidation?.valid,
      });
    }

    // providerEntry уже получен выше. Mock-случай кэшируется по флагу isMock.
    if (!providerEntry) {
      return badRequest("Способ оплаты недоступен");
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    const boostLabel = boostOption.name;
    const { paymentUrl, externalId } = await providerEntry.provider.initPayment({
      amount: finalAmount,
      description: `Буст «${boostLabel}» для объявления`,
      orderId: result.id,
      method: method as PaymentMethodId,
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
      isMock: providerEntry?.providerId === "mock",
      boostType,
      originalAmount,
      discountAmount,
      proRatedDiscount,
      finalAmount,
      isFree: false,
      upgraded: !!lowerTierBoost,
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
    console.error("[POST /api/payments/ads/[id]/boost]", err);
    return serverError();
  }
}
