import type { BoostType } from "@/lib/types/payment";

export interface ActiveBoostDetail {
  boostType: BoostType;
  activatedAt: string;
  expiresAt: string;
}

export const BOOST_PRIORITY: Record<BoostType, number> = {
  premium: 3,
  vip: 2,
  rise: 1,
};

export function getTopBoost(
  details: ActiveBoostDetail[] | undefined,
): ActiveBoostDetail | null {
  if (!details || details.length === 0) return null;
  return [...details].sort(
    (a, b) => BOOST_PRIORITY[b.boostType] - BOOST_PRIORITY[a.boostType],
  )[0];
}

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function formatDaysLeft(expiresAt: string): string {
  const d = daysLeft(expiresAt);
  if (d === 0) return "<1 дн.";
  if (d === 1) return "1 день";
  if (d >= 2 && d <= 4) return `${d} дня`;
  return `${d} дней`;
}
