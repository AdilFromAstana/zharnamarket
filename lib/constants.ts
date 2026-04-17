import type { BudgetType } from "./types/ad";
import type { BoostOption, BoostType } from "./types/payment";

export const STORAGE_KEYS = {
  AD_DRAFT: "new_ad_draft",
  PAYMENT_STATE: "new_ad_payment_state",
  BOOST_STATE: "boost_payment_state",
  CREATOR_DRAFT: "new_creator_draft",
} as const;

export type RefItem = {
  key: string;
  label: string;
  iconUrl?: string | null;
};

// Кэши для API данных
let citiesCache: RefItem[] | null = null;
let categoriesCache: RefItem[] | null = null;
let platformsCache: RefItem[] | null = null;
let budgetTypesCache: RefItem[] | null = null;
let businessCategoriesCache: RefItem[] | null = null;
let videoFormatsCache: RefItem[] | null = null;
let adFormatsCache: RefItem[] | null = null;
let adSubjectsCache: RefItem[] | null = null;

/** Получить список городов из API */
export async function getCities(): Promise<RefItem[]> {
  if (citiesCache) return citiesCache;

  try {
    const response = await fetch("/api/cities");
    if (!response.ok) throw new Error("Failed to fetch cities");
    const cities = await response.json();
    const result: RefItem[] = cities.map(
      (city: { key: string; label: string }) => ({
        key: city.key,
        label: city.label,
      }),
    );
    citiesCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return [
      { key: "Almaty", label: "Алматы" },
      { key: "Astana", label: "Астана" },
      { key: "Shymkent", label: "Шымкент" },
      { key: "Karaganda", label: "Караганда" },
      { key: "Aktau", label: "Актау" },
      { key: "Pavlodar", label: "Павлодар" },
      { key: "AllCities", label: "Все города" },
    ];
  }
}

/** Получить список платформ из API */
export async function getPlatforms(): Promise<RefItem[]> {
  if (platformsCache) return platformsCache;

  try {
    const response = await fetch("/api/platforms");
    if (!response.ok) throw new Error("Failed to fetch platforms");
    const platforms = await response.json();
    const result: RefItem[] = platforms.map(
      (platform: {
        key: string;
        label: string;
        iconUrl?: string | null;
      }) => ({
        key: platform.key,
        label: platform.label,
        iconUrl: platform.iconUrl ?? null,
      }),
    );
    platformsCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return [
      { key: "TikTok", label: "TikTok" },
      { key: "Instagram", label: "Instagram" },
      { key: "YouTube", label: "YouTube" },
      { key: "Threads", label: "Threads" },
      { key: "Telegram", label: "Telegram" },
      { key: "VK", label: "VK" },
    ];
  }
}

/** Получить список типов бюджета из API */
export async function getBudgetTypes(): Promise<RefItem[]> {
  if (budgetTypesCache) return budgetTypesCache;

  try {
    const response = await fetch("/api/budget-types");
    if (!response.ok) throw new Error("Failed to fetch budget types");
    const budgetTypes = await response.json();
    const result: RefItem[] = budgetTypes.map(
      (type: { key: string; label: string }) => ({
        key: type.key,
        label: type.label,
      }),
    );
    budgetTypesCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching budget types:", error);
    return [
      { key: "fixed", label: "Фиксированная цена" },
      { key: "per_views", label: "За просмотры" },
      { key: "revenue", label: "Доход" },
      { key: "negotiable", label: "Договорная" },
    ];
  }
}

/** Получить список категорий из API */
export async function getCategories(): Promise<RefItem[]> {
  if (categoriesCache) return categoriesCache;

  try {
    const response = await fetch("/api/categories");
    if (!response.ok) throw new Error("Failed to fetch categories");
    const categories = await response.json();
    const result: RefItem[] = categories.map(
      (category: { key: string; label: string }) => ({
        key: category.key,
        label: category.label,
      }),
    );
    categoriesCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [
      { key: "KinoNarezki", label: "Кино-нарезки" },
      { key: "Memy", label: "Мемы" },
      { key: "Obzory", label: "Обзоры" },
      { key: "Podkasty", label: "Подкасты" },
      { key: "Geympley", label: "Геймплей" },
      { key: "MuzykaAtmosfera", label: "Музыка/Атмосфера" },
      { key: "Avto", label: "Авто" },
      { key: "Krasota", label: "Красота" },
      { key: "Sport", label: "Спорт" },
      { key: "Multfilmy", label: "Мультфильмы" },
    ];
  }
}

/** Получить список бизнес-категорий из API */
export async function getBusinessCategories(): Promise<RefItem[]> {
  if (businessCategoriesCache) return businessCategoriesCache;

  try {
    const response = await fetch("/api/business-categories");
    if (!response.ok) throw new Error("Failed to fetch business categories");
    const businessCategories = await response.json();
    const result: RefItem[] = businessCategories.map(
      (category: { key: string; label: string }) => ({
        key: category.key,
        label: category.label,
      }),
    );
    businessCategoriesCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching business categories:", error);
    return [
      { key: "EdaNapitki", label: "Еда и напитки" },
      { key: "Retail", label: "Ретейл" },
      { key: "Uslugi", label: "Услуги" },
      { key: "IT", label: "IT" },
      { key: "KrasotaZdorovie", label: "Красота и здоровье" },
      { key: "SportFitnes", label: "Спорт и фитнес" },
      { key: "Avto", label: "Авто" },
      { key: "Nedvizhimost", label: "Недвижимость" },
      { key: "Drugoe", label: "Другое" },
    ];
  }
}

/** Получить список форматов видео из API */
export async function getVideoFormats(): Promise<RefItem[]> {
  if (videoFormatsCache) return videoFormatsCache;

  try {
    const response = await fetch("/api/video-formats");
    if (!response.ok) throw new Error("Failed to fetch video formats");
    const res = await response.json();
    const result: RefItem[] = (res.data ?? []).map(
      (item: { key: string; label: string }) => ({
        key: item.key,
        label: item.label,
      }),
    );
    videoFormatsCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching video formats:", error);
    return [];
  }
}

/** Получить список форматов рекламы из API */
export async function getAdFormats(): Promise<RefItem[]> {
  if (adFormatsCache) return adFormatsCache;

  try {
    const response = await fetch("/api/ad-formats");
    if (!response.ok) throw new Error("Failed to fetch ad formats");
    const res = await response.json();
    const result: RefItem[] = (res.data ?? []).map(
      (item: { key: string; label: string }) => ({
        key: item.key,
        label: item.label,
      }),
    );
    adFormatsCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching ad formats:", error);
    return [];
  }
}

/** Получить список тематик рекламы из API */
export async function getAdSubjects(): Promise<RefItem[]> {
  if (adSubjectsCache) return adSubjectsCache;

  try {
    const response = await fetch("/api/ad-subjects");
    if (!response.ok) throw new Error("Failed to fetch ad subjects");
    const res = await response.json();
    const result: RefItem[] = (res.data ?? []).map(
      (item: { key: string; label: string }) => ({
        key: item.key,
        label: item.label,
      }),
    );
    adSubjectsCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching ad subjects:", error);
    return [];
  }
}

// Старые статичные константы удалены - теперь используйте асинхронные функции getCities(), getCategories() и т.д.

/**
 * Стоимость базовой публикации объявления.
 * Фиксированная цена — не зависит от дополнительных услуг.
 * Активно 7 дней после оплаты.
 *
 * Логика ценообразования: низкий барьер входа для новой платформы без репутации.
 * Конкуренты: OLX (бесплатно+буст), Krisha (2000–4000 ₸/30дн), Kolesa (3000–5000 ₸/30дн).
 */
export const PUBLICATION_PRICE = 990; // ₸
export const PUBLICATION_DAYS = 7;

/**
 * Стоимость публикации профиля креатора в каталоге.
 * Без срока истечения (в отличие от объявлений).
 */
export const CREATOR_PUBLICATION_PRICE = 990; // ₸

/**
 * Буст-опции — дополнительные платные услуги, докупаемые из ЛК ПОСЛЕ публикации.
 * Аналог OLX VIP/Top/Turbo — отдельные платежи для уже активных объявлений.
 */
export const BOOST_OPTIONS: BoostOption[] = [
  {
    id: "rise",
    name: "Поднятие",
    price: 1990,
    days: 7,
    description: "Объявление поднимается выше в ленте",
    features: [
      "Поднятие выше всех обычных объявлений",
      "Больше показов за 7 дней",
      "Кнопка «Связаться» остаётся активной",
    ],
  },
  {
    id: "vip",
    name: "Выделение",
    price: 2990,
    days: 7,
    description: "Цветное выделение и бейдж",
    features: [
      "Выделение цветовой рамкой в ленте",
      "Бейдж «VIP»",
      "Привлекает внимание при скролле",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "Всё вместе",
    price: 3990,
    days: 7,
    description: "Топ ленты + выделение + бейдж",
    features: [
      "Позиция в топе ленты",
      "Выделение цветовой рамкой",
      "Бейдж «Premium»",
      "Максимальная видимость за 7 дней",
    ],
  },
];

/**
 * Буст-опции для профилей креаторов — аналогичная структура, адаптированные тексты.
 */
export const CREATOR_BOOST_OPTIONS: BoostOption[] = [
  {
    id: "rise",
    name: "Поднятие",
    price: 1990,
    days: 7,
    description: "Профиль поднимается выше в каталоге",
    features: [
      "Поднятие выше всех обычных профилей",
      "Больше просмотров за 7 дней",
      "Больше обращений от заказчиков",
    ],
  },
  {
    id: "vip",
    name: "Выделение",
    price: 2990,
    days: 7,
    description: "Цветное выделение и бейдж",
    features: [
      "Выделение цветовой рамкой в каталоге",
      "Бейдж «VIP»",
      "Привлекает внимание при скролле",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "Всё вместе",
    price: 3990,
    days: 7,
    description: "Топ каталога + выделение + бейдж",
    features: [
      "Позиция в топе каталога",
      "Выделение цветовой рамкой",
      "Бейдж «Premium»",
      "Максимальная видимость за 7 дней",
    ],
  },
];

export const AD_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  pending_payment: "Ожидает оплаты",
  active: "Активно",
  paused: "Пауза",
  expired: "Истекло",
  archived: "Архив",
  deleted: "Удалено",
  budget_exhausted: "Бюджет исчерпан",
  cancelled: "Отменено",
};

export const AD_STATUS_COLORS: Record<string, string> = {
  draft: "default",
  pending_payment: "warning",
  active: "success",
  paused: "processing",
  expired: "error",
  archived: "default",
  deleted: "error",
  budget_exhausted: "warning",
  cancelled: "error",
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  direct: "Через заказчика",
  escrow: "Через платформу",
};

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  submitted: "На модерации",
  approved: "Одобрено",
  rejected: "Отклонено",
  rejected_system: "Отклонено системой",
};

export const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  submitted: "processing",
  approved: "success",
  rejected: "error",
  rejected_system: "error",
};

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  processing: "Обрабатывается",
  completed: "Завершён",
  failed: "Ошибка",
};

export const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  fixed: "Фиксированная",
  per_views: "За просмотры",
  revenue: "% от продаж",
  negotiable: "По договорённости",
};

export const BUDGET_TYPE_COLORS: Record<BudgetType, string> = {
  fixed: "green",
  per_views: "blue",
  revenue: "purple",
  negotiable: "default",
};

// BUDGET_TYPE_ICONS removed — use BudgetTypeIcon component from @/components/ui/BudgetTypeIcon

export const BOOST_LABELS: Record<string, string> = {
  rise: "Топ",
  vip: "VIP",
  premium: "Premium",
};

export const BOOST_COLORS: Record<string, string> = {
  rise: "blue",
  vip: "purple",
  premium: "gold",
};

export const BOOST_BADGE_CONFIG: Record<
  BoostType,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  rise: {
    label: "Топ",
    textClass: "text-sky-700",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-300",
  },
  vip: {
    label: "VIP",
    textClass: "text-violet-700",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-300",
  },
  premium: {
    label: "Premium",
    textClass: "text-amber-700",
    bgClass: "bg-amber-100",
    borderClass: "border-amber-300",
  },
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Свободен",
  partially_available: "Частично",
  busy: "Занят",
};

export const AVAILABILITY_COLORS: Record<string, string> = {
  available: "#22c55e",
  partially_available: "#eab308",
  busy: "#ef4444",
};

export const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "#010101",
  Instagram: "#E1306C",
  YouTube: "#FF0000",
};

/** Tailwind-классы для бейджей платформ (фон + текст) */
export const PLATFORM_BADGE_CLASSES: Record<string, string> = {
  TikTok: "bg-black text-white",
  Instagram:
    "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white",
  YouTube: "bg-red-600 text-white",
};

// ─── Эскроу ──────────────────────────────────────────────────────────────────

/** Комиссия платформы с каждой выплаты креатору */
export const PLATFORM_COMMISSION_RATE = 0.05; // 5%

/** Минимальная сумма вывода на карту / Kaspi */
export const MIN_WITHDRAWAL_AMOUNT = 500; // ₸

/** Минимальный RPM (₸ за 1000 просмотров) */
export const MIN_RPM = 50; // ₸

/** Максимальный RPM */
export const MAX_RPM = 10000; // ₸

/** Минимальный бюджет эскроу-задания */
export const MIN_ESCROW_BUDGET = 1000; // ₸

/** Минимум просмотров по умолчанию (если заказчик не указал) */
export const DEFAULT_MIN_VIEWS = 10000;

/** SLA модерации подачи видео */
export const MODERATION_SLA_HOURS = 24;

/** Дедлайн апелляции после отклонения */
export const APPEAL_DEADLINE_HOURS = 48;

/** Срок обработки вывода средств (рабочие дни) */
export const WITHDRAWAL_PROCESSING_DAYS = 3;

// ─── Отзывы ──────────────────────────────────────────────────────────────────

/** Ограничения отзывов */
export const REVIEW_CONSTRAINTS = {
  MIN_COMMENT_LENGTH: 10,
  MAX_COMMENT_LENGTH: 2000,
  MAX_REPLY_LENGTH: 1000,
  MIN_RATING: 1,
  MAX_RATING: 5,
} as const;

/** Текстовые метки для звёзд */
export const RATING_LABELS: Record<number, string> = {
  1: "Ужасно",
  2: "Плохо",
  3: "Нормально",
  4: "Хорошо",
  5: "Отлично",
};
