import type { BoostType } from "@prisma/client";

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
