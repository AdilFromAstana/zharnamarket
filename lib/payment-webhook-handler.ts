/**
 * Применяет результат платежа к БД (общая логика для всех провайдеров).
 *
 * Предполагается, что подпись webhook уже проверена вызывающим кодом.
 * Идемпотентность гарантируется: если сессия уже в финальном статусе,
 * повторный вызов вернёт ok:true без побочных эффектов.
 */

import { prisma } from "@/lib/prisma";
import { PUBLICATION_DAYS, BOOST_OPTIONS, CREATOR_BOOST_OPTIONS } from "@/lib/constants";
import { RAISE_PRIORITY } from "@/lib/boost";
import type { BoostType } from "@prisma/client";
import type { WebhookPayload } from "@/lib/payment-providers";
import { sendPaymentReceiptEmail, type PaymentReceiptType } from "@/lib/email";

export interface ApplyResult {
  ok: boolean;
  reason?: "not_found" | "already_processed";
}

export async function applyPaymentWebhook(payload: WebhookPayload): Promise<ApplyResult> {
  const session = await prisma.paymentSession.findUnique({
    where: { id: payload.orderId },
  });

  if (!session) return { ok: false, reason: "not_found" };

  // Idempotency: если уже обработана — считаем что всё ок
  if (session.status !== "pending") {
    return { ok: true, reason: "already_processed" };
  }

  if (payload.status === "success") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.paymentSession.update({
        where: { id: session.id },
        data: { status: "success", externalId: payload.externalId },
      });

      if (session.type === "ad_publication" && session.adId) {
        const now = new Date();
        const daysMs = PUBLICATION_DAYS * 24 * 60 * 60 * 1000;

        const currentAd = await tx.ad.findUnique({
          where: { id: session.adId },
          select: { status: true, expiresAt: true },
        });

        const isExtension = currentAd?.status === "active";
        const newExpiresAt = isExtension
          ? new Date(
              (currentAd.expiresAt && currentAd.expiresAt > now
                ? currentAd.expiresAt
                : now
              ).getTime() + daysMs,
            )
          : new Date(now.getTime() + daysMs);

        await tx.ad.update({
          where: { id: session.adId },
          data: {
            status: "active",
            expiresAt: newExpiresAt,
            ...(isExtension ? {} : { publishedAt: now, raisedAt: now }),
          },
        });
      } else if (session.type === "creator_publication" && session.creatorProfileId) {
        await tx.creatorProfile.update({
          where: { id: session.creatorProfileId },
          data: { isPublished: true, publishedAt: new Date() },
        });
      } else if (session.type === "escrow_deposit" && session.adId) {
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
        await tx.ad.update({
          where: { id: session.adId },
          data: { status: "active", publishedAt: new Date() },
        });
      } else if (session.type === "escrow_topup" && session.adId) {
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
          await tx.ad.updateMany({
            where: { id: session.adId, status: "budget_exhausted" },
            data: { status: "active" },
          });
        }
      } else if (session.type === "wallet_topup") {
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
        const daysMs = days * 24 * 60 * 60 * 1000;
        const newPriority = RAISE_PRIORITY[session.boostType as BoostType];

        const activeBoosts = await tx.adBoost.findMany({
          where: { adId: session.adId, expiresAt: { gte: now } },
          select: { id: true, boostType: true, expiresAt: true },
        });
        const sameTier = activeBoosts.find(
          (b: { boostType: BoostType }) =>
            b.boostType === (session.boostType as BoostType),
        );
        const lowerTier = activeBoosts.find(
          (b: { boostType: BoostType }) =>
            b.boostType !== (session.boostType as BoostType) &&
            RAISE_PRIORITY[b.boostType] < newPriority,
        );

        const expiresAt = sameTier
          ? new Date(sameTier.expiresAt.getTime() + daysMs)
          : new Date(now.getTime() + daysMs);

        if (sameTier) {
          await tx.adBoost.update({
            where: { id: sameTier.id },
            data: { expiresAt },
          });
        } else {
          if (lowerTier) {
            await tx.adBoost.update({
              where: { id: lowerTier.id },
              data: { expiresAt: now },
            });
          }
          await tx.adBoost.create({
            data: {
              adId: session.adId,
              boostType: session.boostType as BoostType,
              activatedAt: now,
              expiresAt,
            },
          });
        }

        await tx.ad.update({
          where: { id: session.adId },
          data: { raisedAt: now },
        });
      } else if (
        session.type === "creator_boost" &&
        session.creatorProfileId &&
        session.boostType
      ) {
        const boostOption = CREATOR_BOOST_OPTIONS.find(
          (b) => b.id === session.boostType,
        );
        const days = boostOption?.days ?? 7;
        const now = new Date();
        const daysMs = days * 24 * 60 * 60 * 1000;
        const newPriority = RAISE_PRIORITY[session.boostType as BoostType];

        const activeBoosts = await tx.creatorBoost.findMany({
          where: {
            creatorProfileId: session.creatorProfileId,
            expiresAt: { gte: now },
          },
          select: { id: true, boostType: true, expiresAt: true },
        });
        const sameTier = activeBoosts.find(
          (b: { boostType: BoostType }) =>
            b.boostType === (session.boostType as BoostType),
        );
        const lowerTier = activeBoosts.find(
          (b: { boostType: BoostType }) =>
            b.boostType !== (session.boostType as BoostType) &&
            RAISE_PRIORITY[b.boostType] < newPriority,
        );

        const expiresAt = sameTier
          ? new Date(sameTier.expiresAt.getTime() + daysMs)
          : new Date(now.getTime() + daysMs);

        if (sameTier) {
          await tx.creatorBoost.update({
            where: { id: sameTier.id },
            data: { expiresAt },
          });
        } else {
          if (lowerTier) {
            await tx.creatorBoost.update({
              where: { id: lowerTier.id },
              data: { expiresAt: now },
            });
          }
          await tx.creatorBoost.create({
            data: {
              creatorProfileId: session.creatorProfileId,
              boostType: session.boostType as BoostType,
              activatedAt: now,
              expiresAt,
            },
          });
        }

        await tx.creatorProfile.update({
          where: { id: session.creatorProfileId },
          data: { raisedAt: now },
        });
      }
    });

    console.log("[Webhook] Payment successful:", session.id, payload.externalId);

    // Fire-and-forget receipt email. Ошибка почты не должна ломать webhook-ответ,
    // т.к. БД уже закоммичена и повторный webhook провайдер не пришлёт.
    sendReceiptForSession(session).catch((err) => {
      console.error("[Webhook] Receipt email failed:", err);
    });
  } else {
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: { status: "failed", externalId: payload.externalId },
    });
    console.log("[Webhook] Payment failed:", session.id, payload.externalId);
  }

  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendReceiptForSession(session: any): Promise<void> {
  const type = session.type as PaymentReceiptType;
  // Только эти типы считаются транзакциями, за которые шлём чек.
  if (
    type !== "ad_publication" &&
    type !== "creator_publication" &&
    type !== "escrow_deposit" &&
    type !== "escrow_topup" &&
    type !== "wallet_topup" &&
    type !== "ad_boost" &&
    type !== "creator_boost"
  ) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user?.email) return;

  let entityTitle: string | undefined;
  let entityId: string | undefined;

  if (session.adId) {
    const ad = await prisma.ad.findUnique({
      where: { id: session.adId },
      select: { title: true },
    });
    entityTitle = ad?.title ?? undefined;
    entityId = session.adId;
  } else if (session.creatorProfileId) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: session.creatorProfileId },
      select: { title: true },
    });
    entityTitle = profile?.title ?? undefined;
    entityId = session.creatorProfileId;
  }

  await sendPaymentReceiptEmail(user.email, {
    type,
    amount: session.amount,
    entityTitle,
    entityId,
  });
}
