import type { Platform, ContentCategory, City } from "./ad";
import type { BoostType } from "./payment";

export type Availability = "available" | "busy" | "partially_available";

export interface CreatorPlatform {
  name: Platform;
  handle: string;
  url: string;
  followers: number | null;
}

export interface PortfolioItem {
  id: string;
  platform: Platform;
  thumbnail: string;
  videoUrl: string;
  category: ContentCategory;
  description: string | null;
  views: number | null;
  likes: number | null;
}

export interface PriceItem {
  label: string;  // Например: "TikTok-ролик до 1 мин", "Instagram Reels", "YouTube интеграция"
  price: number;  // Цена за этот формат в ₸
}

export interface Pricing {
  minimumRate: number;
  negotiable: boolean;
  currency: "KZT";
  /** Детальный прайс-лист по форматам (необязательно) */
  items?: PriceItem[];
}

export interface CreatorContacts {
  telegram: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

export interface CreatorMetadata {
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

/** Агрегированная статистика по escrow-заказам */
export interface CreatorStats {
  completedOrders: number;
  successRate: number | null; // null если нет завершённых заказов
}

export interface CreatorProfile {
  id: string; // уникальный ID профиля (profileId)
  userId: string; // FK → User — один юзер может иметь N профилей
  title: string; // название анкеты: «Мастер нарезок», «АСМР обзорщик»
  isPublished: boolean; // опубликован ли в каталоге (платная публикация)
  fullName: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  city: City;
  age: number | null;
  availability: Availability;
  verified: boolean;
  platforms: CreatorPlatform[];
  contentCategories: ContentCategory[];
  portfolio: PortfolioItem[];
  screenshots: string[];
  pricing: Pricing;
  contacts: CreatorContacts;
  metadata: CreatorMetadata;
  // Рейтинг
  averageRating: number;
  reviewCount: number;
  // Статистика
  contactClickCount: number;
  viewCount: number;
  stats?: CreatorStats;
  avatarColor?: string | null;
  boosts?: BoostType[];
  activeBoostDetails?: ActiveBoostDetail[];
}

export interface ActiveBoostDetail {
  boostType: BoostType;
  activatedAt: string;
  expiresAt: string;
}

// ─── Отзывы ──────────────────────────────────────────────────────────────────

export interface ReviewAuthor {
  id: string;
  name: string;
  avatar: string | null;
  avatarColor?: string | null;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewer: ReviewAuthor;
  targetType: "creator_profile";
  targetId: string;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  data: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  averageRating: number;
  ratingDistribution: Record<number, number>; // {1: count, 2: count, ...}
}

/**
 * Multi-select filter dimensions use arrays of DB enum codes.
 * URL format: comma-separated values (e.g. city=Almaty,Astana).
 */
export interface CreatorFilters {
  city?: string[];
  platform?: string[];
  category?: string[];
  availability?: string[];
  maxRate?: number;
  verified?: boolean;
  minRating?: number;
  sortBy?: "new" | "price" | "alphabet" | "rating" | "popular";
  search?: string;
}

/**
 * Faceted counts for each filter dimension.
 * Keys are DB enum values (e.g. "Almaty", "TikTok", "KinoNarezki").
 * Each dimension's counts are computed with all OTHER active filters applied,
 * but WITHOUT the filter for that dimension itself — standard faceted search.
 */
export interface CreatorFacets {
  platform: Record<string, number>;
  city: Record<string, number>;
  category: Record<string, number>;
  availability: Record<string, number>;
}
