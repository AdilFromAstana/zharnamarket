/**
 * Общие хелперы для email-тестов.
 *
 * DB-фикстуры (user, ad, submission) переиспользуются из `tests/helpers.ts` —
 * здесь только то, что специфично для email-сценариев: создание
 * PaymentSession, submission+appeal и пр.
 */

import { prisma } from "@/lib/prisma";

/** PaymentSession в статусе pending — на входе в applyPaymentWebhook. */
export async function createPendingSession(params: {
  userId: string;
  type:
    | "ad_publication"
    | "creator_publication"
    | "escrow_deposit"
    | "escrow_topup"
    | "wallet_topup"
    | "ad_boost"
    | "creator_boost";
  amount: number;
  adId?: string;
  creatorProfileId?: string;
  boostType?: "rise" | "vip" | "premium";
}) {
  return prisma.paymentSession.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      method: "card",
      status: "pending",
      adId: params.adId ?? null,
      creatorProfileId: params.creatorProfileId ?? null,
      boostType: params.boostType ?? null,
    },
  });
}

/** Минимальный CreatorProfile (не обязательно опубликованный). */
export async function createCreatorProfile(userId: string, overrides: { title?: string } = {}) {
  return prisma.creatorProfile.create({
    data: {
      userId,
      title: overrides.title ?? "Test Creator Profile",
      fullName: "Test Creator",
      isPublished: false,
    },
  });
}

/** Помечает submission как rejected + moderatedAt=now — готово под appeal. */
export async function markSubmissionRejected(
  submissionId: string,
  reason: string = "no_brand",
) {
  return prisma.videoSubmission.update({
    where: { id: submissionId },
    data: {
      status: "rejected",
      rejectionReason: reason,
      moderatedAt: new Date(),
    },
  });
}

/** Appeal в статусе pending — готов под admin/resolve. */
export async function createPendingAppeal(submissionId: string, creatorId: string) {
  return prisma.appeal.create({
    data: {
      submissionId,
      creatorId,
      reason: "Модератор ошибся, метрики корректные",
      status: "pending",
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });
}

/** Короткий sleep для fire-and-forget email-ов (используем `mailbox.waitFor` когда возможно). */
export function tick(ms = 50): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
