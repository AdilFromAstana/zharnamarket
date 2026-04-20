import type { BoostType } from "@prisma/client";
import type { BoostOption } from "@/lib/types/payment";

/**
 * Числовой приоритет буста — используется при выборе
 * наивысшего тира, когда у объявления несколько активных бустов.
 */
export const RAISE_PRIORITY: Record<BoostType, number> = {
  premium: 3,
  vip:     2,
  rise:    1,
};

/**
 * Интервалы между подъёмами (в миллисекундах).
 * Cron запускается каждые 15 мин и поднимает объявление,
 * если с последнего raisedAt прошло >= интервала.
 *
 *   premium — каждый 1 час  (24 подъёма в день)
 *   vip     — каждые 3 часа  (8 подъёмов в день)
 *   rise    — каждые 6 часов (4 подъёма в день)
 */
export const RAISE_INTERVALS_MS: Record<BoostType, number> = {
  premium: 1 * 60 * 60 * 1000,
  vip:     3 * 60 * 60 * 1000,
  rise:    6 * 60 * 60 * 1000,
};

/**
 * Нужно ли поднимать объявление прямо сейчас?
 *
 * @param raisedAt  — текущее значение Ad.raisedAt (null = никогда не поднималось)
 * @param boostType — тип активного буста
 * @param now       — текущее время (по умолчанию new Date())
 */
export function shouldRaise(
  raisedAt: Date | null,
  boostType: BoostType,
  now: Date = new Date(),
): boolean {
  if (!raisedAt) return true;
  const interval = RAISE_INTERVALS_MS[boostType];
  return now.getTime() - raisedAt.getTime() >= interval;
}

/**
 * Pro-rated discount при апгрейде с младшего тира на старший.
 * Считает остаток от активного младшего буста и возвращает его как скидку.
 *
 * @param existingBoost активный буст младшего тира (с boostType и expiresAt)
 * @param newBoostOption тариф, на который пользователь апгрейдит
 * @param allOptions справочник всех BoostOption (для поиска цены/дней старого тира)
 * @param now текущее время
 * @returns сумма скидки в тенге. 0 если скидки нет. Кап на цену нового тарифа.
 */
export function computeProRatedDiscount(
  existingBoost: { boostType: BoostType; expiresAt: Date } | null | undefined,
  newBoostOption: BoostOption,
  allOptions: BoostOption[],
  now: Date = new Date(),
): number {
  if (!existingBoost) return 0;
  if (existingBoost.boostType === newBoostOption.id) return 0;
  const existingOpt = allOptions.find((b) => b.id === existingBoost.boostType);
  if (!existingOpt) return 0;
  if (existingOpt.price >= newBoostOption.price) return 0; // апгрейд только от дешёвого к дорогому
  const totalMs = existingOpt.days * 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(
    0,
    existingBoost.expiresAt.getTime() - now.getTime(),
  );
  const remainingFraction = Math.min(1, remainingMs / totalMs);
  const proRated = Math.round(existingOpt.price * remainingFraction);
  // Кап на цену нового тарифа — скидка не может превышать его стоимость
  return Math.min(proRated, newBoostOption.price);
}
