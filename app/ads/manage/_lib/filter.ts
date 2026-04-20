import type { Ad, AdStatus } from "@/lib/types/ad";

export type FilterKey = "all" | "draft" | "active" | "paused" | "expired";

export const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  draft: "Черновики",
  active: "Активные",
  paused: "Пауза",
  expired: "Истекшие",
};

const FILTER_STATUSES: Record<FilterKey, AdStatus[]> = {
  all: [
    "draft",
    "pending_payment",
    "active",
    "paused",
    "expired",
    "archived",
    "budget_exhausted",
    "cancelled",
    "deleted",
  ],
  draft: ["draft", "pending_payment"],
  active: ["active"],
  paused: ["paused"],
  expired: ["expired", "archived", "budget_exhausted"],
};

const VALID_KEYS: ReadonlySet<string> = new Set<FilterKey>([
  "all",
  "draft",
  "active",
  "paused",
  "expired",
]);

export function parseFilter(raw: string | null | undefined): FilterKey {
  if (raw && VALID_KEYS.has(raw)) return raw as FilterKey;
  return "all";
}

export function filterAds(ads: Ad[], key: FilterKey): Ad[] {
  if (key === "all") return ads;
  const statuses = FILTER_STATUSES[key];
  return ads.filter((a) => statuses.includes(a.status));
}

export function getFilterCounts(ads: Ad[]): Record<FilterKey, number> {
  return {
    all: ads.length,
    draft: filterAds(ads, "draft").length,
    active: filterAds(ads, "active").length,
    paused: filterAds(ads, "paused").length,
    expired: filterAds(ads, "expired").length,
  };
}
