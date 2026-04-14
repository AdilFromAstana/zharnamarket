/**
 * Утилиты для распределения бустнутых элементов в каталоге.
 *
 * Логика (interleaved-модель, как на Fiverr/LinkedIn/Upwork):
 * - Бустнутые элементы распределяются ПРОПОРЦИОНАЛЬНО по всем страницам
 * - На каждой странице: Premium → VIP → Rise (дороже = выше)
 * - Per-visitor ротация: каждый посетитель видит свой порядок
 * - Внутри одного тира — часовая ротация + visitor seed (справедливое распределение)
 * - Все тиры видны на каждой странице, а не кучкуются на первых/последних
 *
 * Работает с любым форматом: raw Prisma объекты (boosts: [{...}])
 * и маппированные (boosts: ["rise", "vip"]).
 */

const BOOST_PRIORITY: Record<string, number> = { premium: 3, vip: 2, rise: 1 };

/** Определяет наивысший приоритет буста у элемента */
function getBoostPriority(item: { boosts?: unknown[] | null }): number {
  if (!item.boosts || item.boosts.length === 0) return 0;
  let max = 0;
  for (const b of item.boosts) {
    const bt =
      typeof b === "string"
        ? b
        : (b as { boostType?: string }).boostType;
    max = Math.max(max, BOOST_PRIORITY[bt ?? ""] ?? 0);
  }
  return max;
}

/** Хеширует строку в 32-bit число (DJB2-подобный алгоритм) */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Детерминированный шаффл с seed (Linear Congruential Generator) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  if (arr.length <= 1) return arr;
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Сортирует бустнутые элементы по приоритету: Premium → VIP → Rise.
 * Внутри одного тира — часовая ротация (seed = текущий час).
 * Все Premium'ы получают равные шансы быть #1, ротация каждый час.
 */
export function sortByBoostPriority<
  T extends { boosts?: unknown[] | null },
>(items: T[]): T[] {
  if (items.length === 0) return items;

  // Группируем по приоритету
  const groups: Record<number, T[]> = {};
  for (const item of items) {
    const p = getBoostPriority(item);
    (groups[p] ??= []).push(item);
  }

  // Seed меняется каждый час → позиции ротируются раз в час
  const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000));

  // Группы по убыванию приоритета, внутри каждой — часовой шаффл
  return [3, 2, 1].flatMap((p) =>
    seededShuffle(groups[p] ?? [], hourSeed + p),
  );
}

/**
 * Группирует элементы по тиру и возвращает shuffled-массивы для каждого тира.
 *
 * Seed = hourBlock + visitorHash + priority:
 * - hourBlock меняется каждый час → ротация во времени
 * - visitorHash уникален для каждого посетителя → разные порядки одновременно
 * - priority разделяет шафлы между тирами
 */
function groupByTierShuffled<T extends { boosts?: unknown[] | null }>(
  items: T[],
  visitorId?: string,
): { premium: T[]; vip: T[]; rise: T[] } {
  const tiers: Record<number, T[]> = { 3: [], 2: [], 1: [] };
  for (const item of items) {
    const p = getBoostPriority(item);
    if (p > 0) (tiers[p] ??= []).push(item);
  }

  const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000));
  const visitorHash = visitorId ? hashString(visitorId) : 0;
  const baseSeed = hourSeed + visitorHash;

  return {
    premium: seededShuffle(tiers[3] ?? [], baseSeed + 3),
    vip: seededShuffle(tiers[2] ?? [], baseSeed + 2),
    rise: seededShuffle(tiers[1] ?? [], baseSeed + 1),
  };
}

/** Вычисляет слайс массива для конкретной страницы при равномерном распределении */
function tierSlice<T>(tierItems: T[], page: number, totalPages: number): T[] {
  if (tierItems.length === 0 || totalPages === 0) return [];
  const perPage = Math.ceil(tierItems.length / totalPages);
  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, tierItems.length);
  return tierItems.slice(start, end);
}

/**
 * Распределяет бустнутые элементы по тирам на каждую страницу.
 *
 * Каждая страница получает пропорциональный микс всех тиров:
 * [Premium слайс] + [VIP слайс] + [Rise слайс]
 *
 * Это interleaved-модель (Fiverr/LinkedIn/Upwork):
 * - PREMIUM всегда наверху каждой страницы
 * - VIP посередине
 * - RISE ниже, но ВСЁ РАВНО на каждой странице
 * - Внутри тира — per-visitor ротация (seed = час + visitorId)
 *
 * @param items — все бустнутые элементы (без обычных)
 * @param page — текущая страница (1-indexed)
 * @param totalPages — общее число страниц
 * @param visitorId — анонимный ID посетителя (cookie vw_vid) для per-visitor ротации
 */
export function distributeBoostedByTier<
  T extends { boosts?: unknown[] | null },
>(items: T[], page: number, totalPages: number, visitorId?: string): T[] {
  if (items.length === 0 || totalPages === 0) return [];

  const { premium, vip, rise } = groupByTierShuffled(items, visitorId);

  return [
    ...tierSlice(premium, page, totalPages),
    ...tierSlice(vip, page, totalPages),
    ...tierSlice(rise, page, totalPages),
  ];
}

/**
 * Считает суммарное количество бустнутых элементов на страницах ДО текущей.
 * Нужно для корректного расчёта regularSkip.
 *
 * @param visitorId — должен совпадать с visitorId из distributeBoostedByTier
 */
export function countBoostedBeforePage<
  T extends { boosts?: unknown[] | null },
>(items: T[], page: number, totalPages: number, visitorId?: string): number {
  if (items.length === 0 || totalPages === 0) return 0;

  const { premium, vip, rise } = groupByTierShuffled(items, visitorId);
  let count = 0;

  for (let p = 1; p < page; p++) {
    count +=
      tierSlice(premium, p, totalPages).length +
      tierSlice(vip, p, totalPages).length +
      tierSlice(rise, p, totalPages).length;
  }

  return count;
}
