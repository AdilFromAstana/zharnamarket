"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Film, Zap, Crown } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import type { CreatorProfile } from "@/lib/types/creator";
import type { BoostType } from "@/lib/types/payment";
import { formatFollowers } from "@/lib/utils";
import StarRating from "@/components/reviews/StarRating";
import {
  PLATFORM_COLORS,
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
} from "@/lib/constants";
import { ENUM_TO_CATEGORY, ENUM_TO_CITY } from "@/lib/enum-maps";
import { cn, getAvatarGradient } from "@/lib/utils";

const SAVED_CREATORS_KEY = "saved_creators";

function getSavedCreators(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_CREATORS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function toggleSavedCreator(id: string): boolean {
  const saved = getSavedCreators();
  const idx = saved.indexOf(id);
  if (idx === -1) {
    saved.push(id);
    localStorage.setItem(SAVED_CREATORS_KEY, JSON.stringify(saved));
    return true;
  } else {
    saved.splice(idx, 1);
    localStorage.setItem(SAVED_CREATORS_KEY, JSON.stringify(saved));
    return false;
  }
}

// ── Boost helpers ────────────────────────────────────────────────────────────

type BoostLevel = BoostType | null;

function getBoostLevel(boosts?: BoostType[]): BoostLevel {
  if (!boosts || boosts.length === 0) return null;
  if (boosts.includes("premium")) return "premium";
  if (boosts.includes("vip")) return "vip";
  if (boosts.includes("rise")) return "rise";
  return null;
}

// ── Конфиг буст-бейджей ─────────────────────────────────────────────────────
const BOOST_FLOATING_BADGE: Record<
  BoostType,
  { bg: string; text: string; label: string; icon: "zap" | "crown" }
> = {
  rise: {
    bg: "bg-sky-500 shadow-sky-200",
    text: "text-white",
    label: "Топ",
    icon: "zap",
  },
  vip: {
    bg: "bg-gradient-to-r from-violet-500 to-pink-400 shadow-violet-200",
    text: "text-white",
    label: "VIP",
    icon: "zap",
  },
  premium: {
    bg: "bg-amber-400 shadow-amber-200",
    text: "text-slate-900",
    label: "Premium",
    icon: "crown",
  },
};

// ── Стили карточки ───────────────────────────────────────────────────────────
function getCardClass(boost: BoostLevel): string {
  const base =
    "relative rounded-[32px] p-5 transition-all duration-300 flex flex-col h-full";

  if (boost === "premium") {
    return cn(
      base,
      "bg-gradient-to-br from-amber-50 to-white border-2 border-amber-400",
      "shadow-[0_20px_40px_-15px_rgba(245,158,11,0.20)]",
    );
  }
  if (boost === "vip") {
    return cn(
      base,
      "bg-gradient-to-br from-violet-50 to-white border-2 border-violet-400",
      "shadow-[0_20px_40px_-15px_rgba(167,139,250,0.20)]",
    );
  }
  if (boost === "rise") {
    return cn(
      base,
      "bg-white border-2 border-sky-400",
      "shadow-[0_20px_40px_-15px_rgba(14,165,233,0.18)]",
    );
  }
  return cn(
    base,
    "bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5",
  );
}

// ── Стили аватара (ring) ────────────────────────────────────────────────────
function getAvatarRingClass(boost: BoostLevel): string {
  if (boost === "premium") return "ring-2 ring-amber-200";
  if (boost === "vip") return "ring-2 ring-violet-200";
  if (boost === "rise") return "ring-2 ring-sky-200";
  return "ring-2 ring-white";
}

// ── Стили CTA-кнопки ────────────────────────────────────────────────────────
function getCtaClass(boost: BoostLevel): string {
  const base =
    "py-2 px-5 rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0";
  if (boost === "premium")
    return cn(
      base,
      "bg-amber-400 text-slate-900 shadow-lg shadow-amber-200 hover:bg-amber-500",
    );
  if (boost === "vip")
    return cn(
      base,
      "bg-gradient-to-r from-violet-500 to-pink-400 text-white shadow-lg shadow-violet-200 hover:opacity-90",
    );
  if (boost === "rise")
    return cn(
      base,
      "bg-sky-600 text-white shadow-lg shadow-sky-200 hover:bg-sky-700",
    );
  return cn(
    base,
    "bg-sky-600 text-white shadow-lg shadow-sky-200 hover:bg-sky-700",
  );
}

// ── Иконка буст-бейджа ────────────────────────────────────────────────────
function BoostIcon({ type, color }: { type: "zap" | "crown"; color: string }) {
  if (type === "crown")
    return <Crown size={10} className={color} fill="currentColor" />;
  return <Zap size={10} fill="white" className="text-white" />;
}

// ── Компонент ────────────────────────────────────────────────────────────────

interface CreatorCardProps {
  creator: CreatorProfile;
}

export default function CreatorCard({ creator }: CreatorCardProps) {
  const router = useRouter();
  const boostLevel = getBoostLevel(creator.boosts as BoostType[] | undefined);
  const cardClass = getCardClass(boostLevel);
  const ctaClass = getCtaClass(boostLevel);
  const avatarRing = getAvatarRingClass(boostLevel);
  const badgeConfig = boostLevel ? BOOST_FLOATING_BADGE[boostLevel] : null;
  const avatarGradient =
    creator.avatarColor ?? getAvatarGradient(creator.fullName);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getSavedCreators().includes(creator.id));
  }, [creator.id]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleSavedCreator(creator.id);
    setSaved(next);
  };

  // Ограничиваем до 2 платформ
  const topPlatforms = creator.platforms.slice(0, 2);
  const extraPlatforms = creator.platforms.length - 2;

  // Ограничиваем до 2 категорий + конвертируем транслит в русский
  const topCategories = creator.contentCategories.slice(0, 2);
  const extraCategories = creator.contentCategories.length - 2;

  // Количество работ в портфолио
  const portfolioCount = creator.portfolio.length;

  // Прайс-лист: показываем первые 2 позиции из items или fallback на minimumRate
  const priceItems = creator.pricing.items?.slice(0, 2) ?? [];
  const hasPriceItems = priceItems.length > 0;
  const extraPriceItems = (creator.pricing.items?.length ?? 0) - 2;
  const fallbackPrice =
    creator.pricing.minimumRate > 0
      ? `от ${creator.pricing.minimumRate.toLocaleString("ru-KZ")} ₸`
      : "По договорённости";

  return (
    <Link href={`/creators/${creator.id}`} className="block group h-full">
      {/* Relative wrapper нужен для floating badge */}
      <div className="relative h-full">
        {/* ── Floating badge ────────────────────────────────────────────── */}
        {badgeConfig && (
          <div
            className={cn(
              "absolute -top-3 left-6 z-10",
              "flex items-center gap-1 px-3 py-1 rounded-full",
              "text-[10px] font-black uppercase tracking-widest",
              "shadow-lg",
              badgeConfig.bg,
              badgeConfig.text,
            )}
          >
            <BoostIcon type={badgeConfig.icon} color={badgeConfig.text} />
            {badgeConfig.label}
          </div>
        )}

        {/* ── Карточка ─────────────────────────────────────────────────── */}
        <div className={cardClass}>
          {/* ── Кнопка сохранить (сердце) ───────────────────────────── */}
          <button
            onClick={handleSave}
            className={cn(
              "absolute top-5 right-5 z-10 shrink-0 transition-colors p-0.5",
              saved ? "text-red-500" : "text-slate-300 hover:text-red-400",
            )}
            title={saved ? "Убрать из сохранённых" : "Сохранить"}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>

          {/* ── Шапка: аватар + имя + статус ────────────────────────── */}
          <div className="flex items-start gap-4 pr-8">
            {/* Аватар */}
            <div className="shrink-0">
              {creator.avatar ? (
                <img
                  src={creator.avatar}
                  alt={creator.fullName}
                  className={cn(
                    "w-14 h-14 rounded-full object-cover shadow-md",
                    avatarRing,
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-md",
                    avatarGradient,
                    avatarRing,
                  )}
                >
                  {creator.fullName.charAt(0)}
                </div>
              )}
            </div>

            {/* Имя + статус доступности */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[17px] font-bold text-slate-900 leading-snug group-hover:text-sky-700 transition-colors truncate">
                  {creator.fullName}
                </span>
                {creator.verified && <VerifiedBadge size={14} />}
              </div>

              {/* Город + доступность */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={11} />
                  {ENUM_TO_CITY[creator.city] ?? creator.city}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5",
                    creator.availability === "available" &&
                      "text-green-700 bg-green-50",
                    creator.availability === "busy" && "text-red-600 bg-red-50",
                    creator.availability === "partially_available" &&
                      "text-yellow-700 bg-yellow-50",
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                    style={{
                      background: AVAILABILITY_COLORS[creator.availability],
                    }}
                  />
                  {AVAILABILITY_LABELS[creator.availability]}
                </span>
                {/* Рейтинг */}
                {creator.reviewCount > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <StarRating rating={creator.averageRating} size="sm" />
                    <span className="text-xs font-medium text-gray-700">
                      {creator.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({creator.reviewCount})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Платформы ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            {topPlatforms.map((p) => {
              const color = PLATFORM_COLORS[p.name];
              return (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                  style={{
                    backgroundColor: color === "#010101" ? "#18181b" : color,
                  }}
                >
                  {p.name}
                  {p.followers && (
                    <span className="opacity-75 font-normal">
                      {formatFollowers(p.followers)}
                    </span>
                  )}
                </span>
              );
            })}
            {extraPlatforms > 0 && (
              <span className="text-xs text-slate-400">+{extraPlatforms}</span>
            )}
          </div>

          {/* ── Категории ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {topCategories.map((cat) => (
              <span
                key={cat}
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700"
              >
                {ENUM_TO_CATEGORY[cat] ?? cat}
              </span>
            ))}
            {extraCategories > 0 && (
              <span className="text-xs text-slate-400">+{extraCategories}</span>
            )}
          </div>

          {/* ── Footer: портфолио + цена + кнопка ────────────────────── */}
          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              {/* Количество работ в портфолио */}
              {portfolioCount > 0 && (
                <span className="flex items-center gap-1 text-[12px] font-semibold text-slate-400">
                  <Film size={11} className="text-slate-400 shrink-0" />
                  {portfolioCount}{" "}
                  {portfolioCount === 1
                    ? "работа"
                    : portfolioCount < 5
                      ? "работы"
                      : "работ"}
                </span>
              )}
              {/* Прайс-лист по форматам или fallback */}
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                  Прайс
                </span>
                {hasPriceItems ? (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {priceItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                          {item.label}
                        </span>
                        <span className="text-[12px] font-bold text-slate-900 shrink-0">
                          {item.price.toLocaleString("ru-KZ")} ₸
                        </span>
                      </div>
                    ))}
                    {extraPriceItems > 0 && (
                      <span className="text-[11px] text-slate-400">
                        +{extraPriceItems} форматов
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "font-bold leading-tight mt-0.5",
                      creator.pricing.minimumRate > 0
                        ? "text-slate-900 text-[15px]"
                        : "text-slate-500 text-[13px]",
                    )}
                  >
                    {fallbackPrice}
                  </div>
                )}
              </div>
            </div>

            {/* CTA кнопка */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/creators/${creator.id}`);
              }}
              className={ctaClass}
            >
              Написать
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
