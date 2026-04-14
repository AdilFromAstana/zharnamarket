"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Eye,
  Navigation,
  Zap,
  Crown,
  User,
  Film,
  Megaphone,
  ShoppingBag,
} from "lucide-react";
import { FileOutlined } from "@ant-design/icons";
import type { Ad } from "@/lib/types/ad";
import type { BoostType } from "@/lib/types/payment";
import { formatBudgetPreview, formatBudgetShort } from "@/lib/utils";
import { PLATFORM_BADGE_CLASSES, BUDGET_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";

const SAVED_ADS_KEY = "saved_ads";

function getSavedAds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_ADS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function toggleSavedAd(id: string): boolean {
  const saved = getSavedAds();
  const idx = saved.indexOf(id);
  if (idx === -1) {
    saved.push(id);
    localStorage.setItem(SAVED_ADS_KEY, JSON.stringify(saved));
    return true;
  } else {
    saved.splice(idx, 1);
    localStorage.setItem(SAVED_ADS_KEY, JSON.stringify(saved));
    return false;
  }
}

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
    "relative rounded-[32px] p-5 transition-all duration-300 flex flex-col";

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

// ── Стили изображения (ring) ─────────────────────────────────────────────────
function getImageRingClass(boost: BoostLevel): string {
  if (boost === "premium") return "ring-2 ring-amber-200";
  if (boost === "vip") return "ring-2 ring-violet-200";
  if (boost === "rise") return "ring-2 ring-sky-200";
  return "";
}

// ── Стили CTA-кнопки ────────────────────────────────────────────────────────
function getCtaClass(boost: BoostLevel): string {
  const base =
    "py-2 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0";
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
    "bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200",
  );
}

// ── Иконка буст-бейджа ───────────────────────────────────────────────────────
function BoostIcon({ type, color }: { type: "zap" | "crown"; color: string }) {
  if (type === "crown")
    return <Crown size={10} className={color} fill="currentColor" />;
  return <Zap size={10} fill="white" className="text-white" />;
}

// ── Навигация ────────────────────────────────────────────────────────────────
function getNavIconClass(boost: BoostLevel): string {
  if (boost === "rise") return "text-sky-400";
  if (boost === "vip") return "text-violet-400";
  if (boost === "premium") return "text-amber-400";
  return "";
}

// ── Интерфейс ────────────────────────────────────────────────────────────────
interface AdCardProps {
  ad: Ad;
}

export default function AdCard({ ad }: AdCardProps) {
  const router = useRouter();
  const boostLevel = getBoostLevel(ad.boosts as BoostType[] | undefined);
  const cardClass = getCardClass(boostLevel);
  const badgeConfig = boostLevel ? BOOST_FLOATING_BADGE[boostLevel] : null;

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getSavedAds().includes(ad.id));
  }, [ad.id]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleSavedAd(ad.id);
    setSaved(next);
  };

  return (
    <Link href={`/ads/${ad.id}`} className="block group">
      {/* Relative wrapper нужен для floating badge */}
      <div className="relative">
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

        {/* ── Карточка ──────────────────────────────────────────────────── */}
        <div className={cardClass}>
          {/* ── Кнопка сохранить (абсолютная, верх-право) ─────────────── */}
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

          <div className="flex gap-5">
            {/* ── Изображение + platform badge ────────────────────────── */}
            {/* <div className="relative shrink-0">
              <div
                className={cn(
                  "w-20 h-20 rounded-3xl overflow-hidden bg-slate-100",
                  getImageRingClass(boostLevel),
                )}
              >
                {ad.images?.[0] ? (
                  <img
                    src={ad.images[0]}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileOutlined className="text-2xl text-slate-300" />
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "absolute -bottom-1 -right-1 w-7 h-7 rounded-full",
                  "flex items-center justify-center border-2 border-white",
                  "text-white text-[10px] font-bold",
                  PLATFORM_BADGE_CLASSES[ad.platform] ?? "bg-gray-800 text-white",
                )}
                title={ad.platform}
              >
                {ad.platform[0]}
              </div>
            </div> */}

            {/* ── Заголовок ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[17px] leading-snug pr-8 text-slate-900 line-clamp-2 group-hover:text-sky-700 transition-colors">
                {ad.title}
              </h3>
            </div>
          </div>

          {/* ── Бюджет + CTA ──────────────────────────────────────────── */}
          <div className="mt-5 flex flex-col justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mb-0.5">
                Бюджет
              </p>
              <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-1">
                {ad.paymentMode === "escrow" && ad.rpm
                  ? `${Number(ad.rpm).toLocaleString("ru")} ₸ / 1 000 просм.`
                  : formatBudgetShort(
                      ad.budgetType,
                      ad.budgetFrom,
                      ad.budgetTo,
                      ad.budgetDetails,
                    )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Формат видео — синий */}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                <Film size={9} className="shrink-0" />
                {ad.videoFormat?.label ??
                  ENUM_TO_CATEGORY[ad.category] ??
                  ad.category}
              </span>
              {/* Формат рекламы — фиолетовый */}
              {ad.adFormat && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-50 border-violet-200 text-violet-700">
                  <Megaphone size={9} className="shrink-0" />
                  {ad.adFormat.label}
                </span>
              )}
              {/* Что рекламируется — оранжевый */}
              {ad.adSubject && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                  <ShoppingBag size={9} className="shrink-0" />
                  {ad.adSubject.label}
                </span>
              )}
              {/* Тип бюджета — серый */}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500">
                <Eye size={9} className="shrink-0" />
                {BUDGET_TYPE_LABELS[ad.budgetType]}
              </span>
              {/* Платформа */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${PLATFORM_BADGE_CLASSES[ad.platform] ?? "bg-gray-800 text-white"}`}
              >
                {ad.platform}
              </span>
              {/* Тип оплаты — зелёный */}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                {ad.paymentMode === "escrow" ? (
                  <Zap size={9} className="shrink-0" />
                ) : (
                  <User size={9} className="shrink-0" />
                )}
                {ad.paymentMode === "escrow"
                  ? "Через платформу"
                  : "Через заказчика"}
              </span>
            </div>
          </div>

          {/* ── Footer: город + просмотры ─────────────────────────────── */}
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-4 text-[12px] font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Navigation size={13} className={getNavIconClass(boostLevel)} />
                {ENUM_TO_CITY[ad.city] ?? ad.city}
              </div>
              {ad.metadata.viewCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Eye size={13} />
                  {ad.metadata.viewCount}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/ads/${ad.id}`);
              }}
              className={getCtaClass(boostLevel)}
            >
              Откликнуться
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
