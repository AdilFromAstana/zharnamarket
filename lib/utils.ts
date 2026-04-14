import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import relativeTime from "dayjs/plugin/relativeTime";
import type { BudgetType } from "./types/ad";

dayjs.extend(relativeTime);
dayjs.locale("ru");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return dayjs(date).format("D MMM YYYY");
}

export function formatRelative(date: string | null): string {
  if (!date) return "—";
  return dayjs(date).fromNow();
}

/** Считает пользователя «онлайн», если lastActiveAt < thresholdMinutes назад */
export function isRecentlyActive(
  date: string | null,
  thresholdMinutes = 5,
): boolean {
  if (!date) return false;
  return dayjs().diff(dayjs(date), "minute") < thresholdMinutes;
}

export function formatFollowers(count: number | null): string {
  if (!count) return "—";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = dayjs(expiresAt).diff(dayjs(), "day");
  return diff > 0 ? diff : 0;
}

export function getTelegramUrl(handle: string): string {
  const clean = handle.replace("@", "");
  return `https://t.me/${clean}`;
}

export function getWhatsappUrl(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}`;
}

/**
 * Короткая версия бюджета для карточек (1 строка, без длинных деталей).
 * per_views / revenue → только числа из budgetDetails, без доп. текста.
 */
export function formatBudgetShort(
  budgetType: BudgetType | null | undefined,
  budgetFrom: number | null | undefined,
  budgetTo: number | null | undefined,
  budgetDetails: string | null | undefined,
): string {
  if (!budgetType) return "Не указано";
  if (budgetType === "negotiable") return "По договорённости";
  if (budgetType === "per_views") {
    // budgetDetails: "3 500–5 000 ₸ за каждые 100 000 просмотров. Промокод: ..."
    // берём только первый сегмент до точки или запятой — это уже читаемо
    if (budgetDetails) {
      const first = budgetDetails.split(/[.,]/)[0].trim();
      return first.length > 0 ? first : "За просмотры";
    }
    return "За просмотры";
  }
  if (budgetType === "revenue") {
    if (budgetDetails) {
      const first = budgetDetails.split(/[.,]/)[0].trim();
      return first.length > 0 ? first : "% от продаж";
    }
    return "% от продаж";
  }
  if (budgetType === "fixed") {
    if (!budgetFrom && !budgetTo) return "—";
    if (budgetFrom && budgetTo && budgetFrom === budgetTo)
      return `${Number(budgetFrom).toLocaleString("ru")} ₸`;
    const from = budgetFrom
      ? `от ${Number(budgetFrom).toLocaleString("ru")} ₸`
      : "";
    const to =
      budgetTo && budgetTo !== budgetFrom
        ? ` до ${Number(budgetTo).toLocaleString("ru")} ₸`
        : "";
    return `${from}${to}`.trim() || "—";
  }
  return "—";
}

/**
 * Форматирует количество просмотров/подписчиков:
 * 2 000 000 → "2.0M", 102 700 → "102.7K", 500 → "500"
 */
export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Определяет платформу по URL видео.
 */
export function detectPlatform(
  url: string,
): "instagram" | "tiktok" | "youtube" | "other" {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be"))
    return "youtube";
  return "other";
}

/**
 * Сокращает URL видео для отображения:
 * "https://www.instagram.com/reels/DWbwtXekR5f/" → "instagram.com/reels/DWbwtXekR5f/"
 */
export function shortenVideoUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** Форматирует бюджет объявления для отображения в карточках и детальной странице */
export function formatBudgetPreview(
  budgetType: BudgetType | null | undefined,
  budgetFrom: number | null | undefined,
  budgetTo: number | null | undefined,
  budgetDetails: string | null | undefined,
): string {
  if (!budgetType) return "Не указано";
  if (budgetType === "negotiable") return "Обсудим";
  if (budgetType === "per_views")
    return `За просмотры: ${budgetDetails || "—"}`;
  if (budgetType === "revenue") return `% от продаж: ${budgetDetails || "—"}`;
  if (budgetType === "fixed") {
    const from = budgetFrom
      ? `от ${Number(budgetFrom).toLocaleString("ru")} ₸`
      : "";
    const to =
      budgetTo && budgetTo !== budgetFrom
        ? ` до ${Number(budgetTo).toLocaleString("ru")} ₸`
        : budgetFrom && budgetTo === budgetFrom
          ? ` ${Number(budgetFrom).toLocaleString("ru")} ₸`
          : "";
    if (!budgetFrom && !budgetTo) return "—";
    if (budgetFrom && budgetTo && budgetFrom === budgetTo)
      return `${Number(budgetFrom).toLocaleString("ru")} ₸`;
    return `${from}${to}`.trim() || "—";
  }
  return "—";
}

// ─── Аватар-градиенты ────────────────────────────────────────────────────────

export const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

/** Детерминированный градиент по строке (имя, ID и т.д.) — fallback если avatarColor не задан. */
export function getAvatarGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/** Случайный градиент — вызывается один раз при создании пользователя. */
export function randomAvatarGradient(): string {
  return AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
}
