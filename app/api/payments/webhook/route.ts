import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment-client";
import { PUBLICATION_DAYS, BOOST_OPTIONS, CREATOR_BOOST_OPTIONS } from "@/lib/constants";
import type { BoostType } from "@prisma/client";

/**
 * POST /api/payments/webhook — обработка callback от платёжного провайдера.
 *
 * НЕ требует JWT авторизации (вызывается провайдером).
 * Безопасность обеспечивается проверкой подписи.
 */
export async function POST(req: NextRequest) {
  try {
    const provider = getPaymentProvider();

    // Парсим тело в зависимости от Content-Type
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, string>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(
        Array.from(formData.entries()).map(([k, v]) => [k, String(v)]),
      );
    } else {
      body = await req.json();
    }

    // Проверяем подпись
    const signature = req.headers.get("x-signature") ?? body.pg_sig ?? "";
    if (!provider.verifyWebhook(body, signature)) {
      console.error("[Webhook] Invalid signature:", { body });
      return new Response("Invalid signature", { status: 403 });
    }

    // Парсим payload
    const payload = provider.parseWebhook(body);

    if (!payload.orderId) {
      console.error("[Webhook] Missing orderId:", payload);
      return new Response("Missing orderId", { status: 400 });
    }

    // Ищем платёжную сессию
    const session = await prisma.paymentSession.findUnique({
      where: { id: payload.orderId },
    });

    if (!session) {
      console.error("[Webhook] PaymentSession not found:", payload.orderId);
      return new Response("Order not found", { status: 404 });
    }

    // Idempotency: если уже обработана — игнорируем повторный webhook
    if (session.status !== "pending") {
      console.log("[Webhook] Already processed:", session.id, session.status);
      return new Response("OK", { status: 200 });
    }

    if (payload.status === "success") {
      // Успешная оплата — активируем в транзакции
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.$transaction(async (tx: any) => {
        // Обновляем статус платежа
        await tx.paymentSession.update({
          where: { id: session.id },
          data: {
            status: "success",
            externalId: payload.externalId,
          },
        });

        // Активируем в зависимости от типа платежа
        if (session.type === "ad_publication" && session.adId) {
          const publishedAt = new Date();
          const expiresAt = new Date(
            publishedAt.getTime() + PUBLICATION_DAYS * 24 * 60 * 60 * 1000,
          );

          await tx.ad.update({
            where: { id: session.adId },
            data: {
              status: "active",
              publishedAt,
              expiresAt,
              // Устанавливаем raisedAt = publishedAt чтобы объявление
              // участвовало в сортировке ленты с момента публикации
              raisedAt: publishedAt,
            },
          });
        } else if (session.type === "creator_publication" && session.creatorProfileId) {
          await tx.creatorProfile.update({
            where: { id: session.creatorProfileId },
            data: {
              isPublished: true,
              publishedAt: new Date(),
            },
          });
        } else if (session.type === "escrow_deposit" && session.adId) {
          // Создаём эскроу-счёт и активируем задание
          await tx.escrowAccount.create({
            data: {
              adId: session.adId,
              initialAmount: session.amount,
              available: session.amount,
              spentAmount: 0,
              reservedAmount: 0,
              status: "active",
            },
          });

          // Задание active, без expiresAt (живёт до дедлайна/исчерпания)
          await tx.ad.update({
            where: { id: session.adId },
            data: {
              status: "active",
              publishedAt: new Date(),
            },
          });
        } else if (session.type === "escrow_topup" && session.adId) {
          // Пополняем существующий эскроу
          const escrow = await tx.escrowAccount.findUnique({
            where: { adId: session.adId },
          });

          if (escrow) {
            await tx.escrowAccount.update({
              where: { adId: session.adId },
              data: {
                initialAmount: { increment: session.amount },
                available: { increment: session.amount },
                status: "active",
              },
            });

            // Если задание было budget_exhausted — реактивируем
            await tx.ad.updateMany({
              where: { id: session.adId, status: "budget_exhausted" },
              data: { status: "active" },
            });
          }
        } else if (session.type === "wallet_topup") {
          // Пополнение кошелька — зачисляем на CreatorBalance (единый кошелёк)
          await tx.creatorBalance.upsert({
            where: { userId: session.userId },
            create: {
              userId: session.userId,
              balance: session.amount,
              totalEarned: session.amount,
              totalTopUp: session.amount,
            },
            update: {
              balance: { increment: session.amount },
              totalEarned: { increment: session.amount },
              totalTopUp: { increment: session.amount },
            },
          });

          const walletBalance = await tx.creatorBalance.findUnique({
            where: { userId: session.userId },
            select: { id: true },
          });

          if (walletBalance) {
            await tx.balanceTransaction.create({
              data: {
                balanceId: walletBalance.id,
                type: "topup",
                amount: session.amount,
                description: `Пополнение кошелька`,
                paymentId: session.id,
              },
            });
          }
        } else if (session.type === "ad_boost" && session.adId && session.boostType) {
          const boostOption = BOOST_OPTIONS.find((b) => b.id === session.boostType);
          const days = boostOption?.days ?? 7;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

          await tx.adBoost.create({
            data: {
              adId: session.adId,
              boostType: session.boostType as BoostType,
              activatedAt: now,
              expiresAt,
            },
          });

          // Немедленно поднимаем объявление при активации платного буста
          await tx.ad.update({
            where: { id: session.adId },
            data: { raisedAt: now },
          });
        } else if (session.type === "creator_boost" && session.creatorProfileId && session.boostType) {
          const boostOption = CREATOR_BOOST_OPTIONS.find((b) => b.id === session.boostType);
          const days = boostOption?.days ?? 7;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

          await tx.creatorBoost.create({
            data: {
              creatorProfileId: session.creatorProfileId,
              boostType: session.boostType as BoostType,
              activatedAt: now,
              expiresAt,
            },
          });

          // Немедленно поднимаем профиль при активации платного буста
          await tx.creatorProfile.update({
            where: { id: session.creatorProfileId },
            data: { raisedAt: now },
          });
        }
      });

      console.log("[Webhook] Payment successful:", session.id, payload.externalId);
    } else {
      // Неудачная оплата
      await prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          status: "failed",
          externalId: payload.externalId,
        },
      });

      console.log("[Webhook] Payment failed:", session.id, payload.externalId);
    }

    // Провайдер ожидает 200 OK
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[POST /api/payments/webhook]", err);
    return new Response("Internal error", { status: 500 });
  }
}
