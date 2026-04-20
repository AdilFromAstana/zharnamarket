import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getProviderForMethod,
  type PaymentMethodId,
} from "@/lib/payment-providers";
import { paymentLimiter, rateLimitGuard } from "@/lib/rate-limit";

/**
 * POST /api/payments/ads/[id]/escrow — Оплата/пополнение эскроу-задания.
 * Замораживает бюджет на эскроу-счёте.
 */
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
    const { method } = body;

    const isWallet = method === "wallet";
    const providerEntry = isWallet
      ? null
      : getProviderForMethod(method as PaymentMethodId);
    if (!isWallet && !providerEntry) {
      return badRequest("Способ оплаты недоступен");
    }

    // Проверяем задание
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        paymentMode: true,
        totalBudget: true,
        title: true,
        escrowAccount: { select: { id: true } },
      },
    });

    if (!ad) return badRequest("Задание не найдено");
    if (ad.ownerId !== userId) return badRequest("Нет доступа");
    if (ad.paymentMode !== "escrow") return badRequest("Задание не в эскроу-режиме");
    if (!ad.totalBudget || ad.totalBudget < 1000) return badRequest("Бюджет не задан");

    // Определяем тип: первый депозит или пополнение
    const isTopup = !!ad.escrowAccount;
    const paymentType = isTopup ? "escrow_topup" : "escrow_deposit";
    const amount = ad.totalBudget;

    if (ad.status !== "draft" && !isTopup) {
      return badRequest("Задание уже оплачено");
    }

    // ── Ветка: оплата из кошелька ──────────────────────────────
    if (isWallet) {
      const wallet = await prisma.creatorBalance.findUnique({
        where: { userId },
        select: { id: true, balance: true },
      });

      const available = wallet?.balance ?? 0;
      if (available < amount) {
        return NextResponse.json(
          {
            error: "Недостаточно средств на кошельке",
            required: amount,
            available,
            shortfall: amount - available,
          },
          { status: 400 },
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.$transaction(async (tx: any) => {
        // Списываем из кошелька
        await tx.creatorBalance.update({
          where: { userId },
          data: {
            balance: { decrement: amount },
            totalSpent: { increment: amount },
          },
        });

        // Запись транзакции
        const txType = isTopup ? "escrow_topup" : "escrow_deposit";
        const txDesc = isTopup
          ? `Пополнение бюджета задания: ${ad.title}`
          : `Бюджет задания: ${ad.title}`;

        await tx.balanceTransaction.create({
          data: {
            balanceId: wallet!.id,
            type: txType,
            amount: -amount,
            description: txDesc,
            adId,
          },
        });

        // Сессия для истории
        await tx.paymentSession.create({
          data: {
            userId,
            type: paymentType as "escrow_deposit" | "escrow_topup",
            amount,
            method: "wallet",
            status: "success",
            adId,
          },
        });

        if (isTopup) {
          // Пополняем существующий эскроу
          await tx.escrowAccount.update({
            where: { adId },
            data: {
              initialAmount: { increment: amount },
              available: { increment: amount },
              status: "active",
            },
          });
          // Реактивируем если был budget_exhausted
          await tx.ad.updateMany({
            where: { id: adId, status: "budget_exhausted" },
            data: { status: "active" },
          });
        } else {
          // Первый депозит — создаём эскроу и активируем задание
          await tx.escrowAccount.create({
            data: {
              adId,
              initialAmount: amount,
              available: amount,
              spentAmount: 0,
              reservedAmount: 0,
              status: "active",
            },
          });
          await tx.ad.update({
            where: { id: adId },
            data: { status: "active", publishedAt: new Date() },
          });
        }
      });

      return NextResponse.json({
        status: "success",
        fromWallet: true,
        amount,
        paymentType,
      });
    }

    // ── Ветка: оплата через платёжного провайдера ──────────────
    // Получаем данные пользователя для платежа
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    // Создаём платёжную сессию
    const session = await prisma.paymentSession.create({
      data: {
        userId,
        type: paymentType as "escrow_deposit" | "escrow_topup",
        amount,
        method: method as PaymentMethodId,
        status: "pending",
        adId,
      },
    });

    // Инициируем платёж
    if (!providerEntry) {
      return badRequest("Способ оплаты недоступен");
    }
    const result = await providerEntry.provider.initPayment({
      amount,
      description: `Эскроу: ${ad.title}`,
      orderId: session.id,
      method: method as PaymentMethodId,
      userEmail: user?.email ?? "",
      userPhone: user?.phone ?? undefined,
    });

    return NextResponse.json({
      paymentUrl: result.paymentUrl,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("[POST /api/payments/ads/[id]/escrow]", err);
    return serverError();
  }
}

/**
 * GET /api/payments/ads/[id]/escrow — Состояние эскроу-счёта.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id: adId } = await params;

    const escrow = await prisma.escrowAccount.findUnique({
      where: { adId },
    });

    if (!escrow) return badRequest("Эскроу-счёт не найден");

    // Проверяем доступ (владелец или админ)
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { ownerId: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (ad?.ownerId !== userId && user?.role !== "admin") {
      return badRequest("Нет доступа");
    }

    return NextResponse.json(escrow);
  } catch (err) {
    console.error("[GET /api/payments/ads/[id]/escrow]", err);
    return serverError();
  }
}
