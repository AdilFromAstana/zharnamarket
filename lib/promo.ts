import { prisma } from "@/lib/prisma";

type PaymentType = "ad_publication" | "ad_boost" | "creator_publication" | "creator_boost";

export type PromoValidationSuccess = {
  valid: true;
  promoCodeId: string;
  code: string;
  discountType: "percent" | "fixed_amount";
  discountValue: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export type PromoValidationFailure = {
  valid: false;
  reason:
    | "not_found"
    | "inactive"
    | "expired"
    | "limit_reached"
    | "not_applicable";
  message: string;
};

export type PromoValidationResult =
  | PromoValidationSuccess
  | PromoValidationFailure;

/**
 * Валидирует промокод и рассчитывает скидку.
 * Используется как в GET /api/promo/validate (предпросмотр),
 * так и внутри платёжных роутов (применение).
 */
export async function validatePromoCode(
  code: string,
  targetType: PaymentType,
  originalAmount: number,
): Promise<PromoValidationResult> {
  const promo = await prisma.promoCode.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
  });

  if (!promo) {
    return { valid: false, reason: "not_found", message: "Промокод не найден" };
  }

  if (!promo.isActive) {
    return {
      valid: false,
      reason: "inactive",
      message: "Промокод недействителен",
    };
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return {
      valid: false,
      reason: "expired",
      message: "Срок действия промокода истёк",
    };
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return {
      valid: false,
      reason: "limit_reached",
      message: "Промокод уже использован максимальное количество раз",
    };
  }

  // Проверяем применимость к типу оплаты
  if (!(promo.applicableTo as string[]).includes(targetType)) {
    return {
      valid: false,
      reason: "not_applicable",
      message: "Промокод не действует на этот тип покупки",
    };
  }

  // Рассчитываем скидку
  let discountAmount: number;
  if (promo.discountType === "percent") {
    discountAmount = Math.round((originalAmount * promo.discountValue) / 100);
  } else {
    discountAmount = promo.discountValue;
  }

  // Скидка не может превышать исходную сумму
  discountAmount = Math.min(discountAmount, originalAmount);
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  return {
    valid: true,
    promoCodeId: promo.id,
    code: promo.code,
    discountType: promo.discountType as "percent" | "fixed_amount",
    discountValue: promo.discountValue,
    originalAmount,
    discountAmount,
    finalAmount,
  };
}

/**
 * Применяет промокод в рамках транзакции — создаёт PromoCodeUsage
 * и инкрементирует usedCount атомарно.
 * Повторно проверяет лимит использований для защиты от race condition.
 */
export async function applyPromoCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  promoCodeId: string,
  paymentId: string,
  userId: string,
  originalAmount: number,
  discountAmount: number,
  finalAmount: number,
): Promise<void> {
  // Повторная проверка лимита внутри транзакции (защита от race condition)
  const promo = await tx.promoCode.findFirst({
    where: { id: promoCodeId },
    select: { maxUses: true, usedCount: true },
  });

  if (promo && promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    throw new Error("PROMO_LIMIT_REACHED");
  }

  await Promise.all([
    tx.promoCodeUsage.create({
      data: {
        promoCodeId,
        paymentId,
        userId,
        originalAmount,
        discountAmount,
        finalAmount,
      },
    }),
    tx.promoCode.update({
      where: { id: promoCodeId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
}
