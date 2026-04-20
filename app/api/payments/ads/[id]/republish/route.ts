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
import {
  getProviderForMethod,
  type PaymentMethodId,
} from "@/lib/payment-providers";
import { paymentLimiter, rateLimitGuard } from "@/lib/rate-limit";

// POST /api/payments/ads/[id]/republish — продлить публикацию объявления
// Работает для status = "expired" (реактивация) и "active" (продление остатка)
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
    const { method, promoCode: promoCodeStr } = body as {
      method?: string;
      promoCode?: string;
    };

    if (!method) return badRequest("Способ оплаты обязателен");

    const isWallet = method === "wallet";
    const providerEntry = isWallet
      ? null
      : getProviderForMethod(method as PaymentMethodId);
    if (!isWallet && !providerEntry) {
      return badRequest("Способ оплаты недоступен");
    }

    const ad = await prisma.ad.findFirst({
      where: { id: adId, deletedAt: null },
    });
    if (!ad) return notFound("Объявление не найдено");
    if (ad.ownerId !== userId) return forbidden();

    // Продление работает для expired и active. Paused/draft/archived/pending — нет.
    if (ad.status !== "expired" && ad.status !== "active") {
      return badRequest(
        "Объявление нельзя продлить в текущем статусе — создайте новое или восстановите из архива",
      );
    }

    // Эскроу-задания не имеют expiresAt и живут до дедлайна — продление не нужно
    if (ad.paymentMode === "escrow") {
      return badRequest(
        "Продление недоступно для эскроу-заданий — пополните бюджет вместо этого",
      );
    }

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

    const isFree = finalAmount === 0;

    const now = new Date();
    const daysMs = PUBLICATION_DAYS * 24 * 60 * 60 * 1000;

    // expired → свежий срок от now. active → продление от текущего конца.
    const wasExpired = ad.status === "expired";
    const newExpiresAt = wasExpired
      ? new Date(now.getTime() + daysMs)
      : new Date(
          (ad.expiresAt && ad.expiresAt > now ? ad.expiresAt : now).getTime() +
            daysMs,
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
              type: "ad_publication",
              amount: -finalAmount,
              description: `Продление публикации: ${ad.title}`,
              adId,
            },
          });

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

          await tx.ad.update({
            where: { id: adId },
            data: {
              status: "active",
              expiresAt: newExpiresAt,
              // publishedAt обновляем только при реактивации из expired
              ...(wasExpired ? { publishedAt: now, raisedAt: now } : {}),
            },
          });

          return payment;
        },
      );

      return NextResponse.json({
        paymentId: result.id,
        status: "success",
        adStatus: "active",
        expiresAt: newExpiresAt.toISOString(),
        originalAmount,
        discountAmount,
        finalAmount,
        isFree: false,
        fromWallet: true,
        extended: !wasExpired,
        promoApplied: !!promoValidation?.valid,
      });
    }

    // ── Ветка: внешняя оплата или бесплатно ──────────────────────
    const result = await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        const paymentData: Record<string, unknown> = {
          userId,
          adId,
          type: "ad_publication",
          amount: finalAmount,
          method: method as PaymentMethodId,
          status: isFree ? "success" : "pending",
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

        if (isFree) {
          await tx.ad.update({
            where: { id: adId },
            data: {
              status: "active",
              expiresAt: newExpiresAt,
              ...(wasExpired ? { publishedAt: now, raisedAt: now } : {}),
            },
          });
        }

        return payment;
      },
    );

    if (isFree) {
      return NextResponse.json({
        paymentId: result.id,
        status: "success",
        adStatus: "active",
        expiresAt: newExpiresAt.toISOString(),
        originalAmount,
        discountAmount,
        finalAmount,
        isFree: true,
        extended: !wasExpired,
        promoApplied: !!promoValidation?.valid,
      });
    }

    if (!providerEntry) {
      return badRequest("Способ оплаты недоступен");
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    const { paymentUrl, externalId } = await providerEntry.provider.initPayment({
      amount: finalAmount,
      description: `Продление публикации: ${ad.title}`,
      orderId: result.id,
      method: method as PaymentMethodId,
      userEmail: user?.email ?? "",
      userPhone: user?.phone ?? undefined,
    });

    await prisma.paymentSession.update({
      where: { id: result.id },
      data: { externalId },
    });

    return NextResponse.json({
      paymentId: result.id,
      paymentUrl,
      status: "pending",
      isMock: providerEntry.providerId === "mock",
      originalAmount,
      discountAmount,
      finalAmount,
      isFree: false,
      extended: !wasExpired,
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
    console.error("[POST /api/payments/ads/[id]/republish]", err);
    return serverError();
  }
}
