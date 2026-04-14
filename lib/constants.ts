import type { Platform, BudgetType } from "./types/ad";
import type { BoostOption, BoostType } from "./types/payment";

export const STORAGE_KEYS = {
  AD_DRAFT: "new_ad_draft",
  PAYMENT_STATE: "new_ad_payment_state",
  BOOST_STATE: "boost_payment_state",
  CREATOR_DRAFT: "new_creator_draft",
} as const;

/** UI-метки городов (русские строки для отображения в фильтрах и формах) */
export const CITIES: string[] = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Караганда",
  "Актау",
  "Павлодар",
  "Все города",
];

export const PLATFORMS: Platform[] = ["TikTok", "Instagram", "YouTube"];

export const BUDGET_TYPES: BudgetType[] = [
  "fixed",
  "per_views",
  "revenue",
  "negotiable",
];

/** UI-метки категорий (русские строки для отображения в фильтрах и формах) */
export const CATEGORIES: string[] = [
  "Кино-нарезки",
  "Мемы",
  "Обзоры",
  "Подкасты",
  "Геймплей",
  "Музыка/Атмосфера",
  "Авто",
  "Красота",
  "Спорт",
  "Мультфильмы",
];

export const BUSINESS_CATEGORIES = [
  "Еда и напитки",
  "Ретейл",
  "Услуги",
  "IT",
  "Красота и здоровье",
  "Спорт и фитнес",
  "Авто",
  "Недвижимость",
  "Другое",
];

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
