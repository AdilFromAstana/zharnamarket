import type { BoostType } from "./payment";

export type AdStatus =
  | "draft"
  | "pending_payment"
  | "active"
  | "paused"
  | "expired"
  | "archived"
  | "deleted"
  | "budget_exhausted"
  | "cancelled";

export type PaymentMode = "direct" | "escrow";

export type Platform = "TikTok" | "Instagram" | "YouTube";

// ContentCategory и City теперь хранятся в базе данных, их ключи - строки
export type ContentCategory = string;
export type City = string;

/**
 * Тип модели оплаты в объявлении (бюджет для блогера, НЕ тариф платформы).
 * fixed      — фиксированная сумма за видео (budgetFrom / budgetTo)
 * per_views  — за просмотры (budgetDetails — свободный текст)
 * revenue    — процент от продаж (budgetDetails — свободный текст)
 * negotiable — обсудим индивидуально
 */
export type BudgetType = "fixed" | "per_views" | "revenue" | "negotiable";

export interface AdContacts {
  telegram: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

export interface AdMetadata {
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  contactClickCount: number;
}

// ─── DB-driven category options (справочники) ────────────────────────────────

export interface CategoryOption {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export type VideoFormatOption = CategoryOption;
export type AdFormatOption = CategoryOption;
export type AdSubjectOption = CategoryOption;

// ─── Ad model ─────────────────────────────────────────────────────────────────

export interface Ad {
  id: string;
  ownerId: string;
  companyName?: string;
  /** Верифицирован ли рекламодатель — заполняется из owner.advertiserProfile.verified */
  ownerVerified?: boolean;
  title: string;
  description: string;
  platform: Platform;
  city: City;
  category: ContentCategory;

  // Новые категорийные измерения (DB-driven)
  videoFormatId?: string | null;
  adFormatId?: string | null;
  adSubjectId?: string | null;
  videoFormat?: VideoFormatOption | null;
  adFormat?: AdFormatOption | null;
  adSubject?: AdSubjectOption | null;

  /** Тип бюджета для блогера — обязательное поле */
  budgetType: BudgetType;
  /** Минимальная сумма (для fixed) */
  budgetFrom?: number | null;
  /** Максимальная сумма (для fixed) */
  budgetTo?: number | null;
  /** Свободный текст (для per_views / revenue / negotiable) */
  budgetDetails?: string | null;
  images: string[] | null;
  contacts: AdContacts;
  /**
   * Список активных буст-опций для этого объявления.
   * Бусты докупаются отдельно из ЛК после публикации.
   */
  boosts?: BoostType[];
  publishedAt: string | null;
  expiresAt: string | null;
  status: AdStatus;
  metadata: AdMetadata;

  // Escrow fields (only when paymentMode=escrow)
  paymentMode: PaymentMode;
  rpm?: number | null;
  minViews?: number | null;
  maxViewsPerCreator?: number | null;
  totalBudget?: number | null;
  submissionDeadline?: string | null;
  escrowAccount?: {
    available: number;
    spentAmount: number;
    reservedAmount: number;
    initialAmount: number;
    status: string;
  } | null;
  applicationsCount?: number;
  submissionsCount?: number;
}

/**
 * Filter state for the ads listing page.
 * Multi-select dimensions use arrays of DB enum codes (e.g. ["Almaty", "Astana"]).
 * URL format: comma-separated values (e.g. city=Almaty,Astana).
 */
export interface AdFilters {
  city?: string[];
  platform?: string[];
  category?: string[];
  budgetType?: string[];
  paymentMode?: string[];
  videoFormat?: string[];
  adFormat?: string[];
  adSubject?: string[];
  sortBy?: "new" | "budget" | "rpm";
  search?: string;
}

/**
 * Faceted counts for each filter dimension.
 * Keys are DB enum values (e.g. "Almaty", "KinoNarezki").
 * Each dimension's counts are computed with all OTHER active filters applied,
 * but WITHOUT the filter for that dimension itself — standard faceted search.
 */
export interface AdFacets {
  platform: Record<string, number>;
  city: Record<string, number>;
  category: Record<string, number>;
  budgetType: Record<string, number>;
  paymentMode: Record<string, number>;
  videoFormat: Record<string, number>;
  adFormat: Record<string, number>;
  adSubject: Record<string, number>;
}
