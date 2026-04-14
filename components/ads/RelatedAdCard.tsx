"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EnvironmentOutlined } from "@ant-design/icons";
import type { Ad } from "@/lib/types/ad";
import { PLATFORM_BADGE_CLASSES } from "@/lib/constants";
import { cn, formatBudgetShort } from "@/lib/utils";
import { ENUM_TO_CITY } from "@/lib/enum-maps";

interface RelatedAdCardProps {
  ad: Ad;
  className?: string;
}

export default function RelatedAdCard({ ad, className }: RelatedAdCardProps) {
  const budget = formatBudgetShort(
    ad.budgetType,
    ad.budgetFrom,
    ad.budgetTo,
    ad.budgetDetails,
  );

  const city = ENUM_TO_CITY[ad.city] ?? ad.city;
  const videoFormatLabel = ad.videoFormat?.label;

  return (
    <Link
      href={`/ads/${ad.id}`}
      className={cn(
        "group flex items-start gap-3 py-3 -mx-4 px-4",
        "hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0",
        className,
      )}
    >
      {/* Основное содержимое */}
      <div className="flex-1 min-w-0">
        {/* Платформа badge — первая строка */}
        <div className="mb-1">
          <span
            className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${PLATFORM_BADGE_CLASSES[ad.platform] ?? "bg-gray-800 text-white"}`}
          >
            {ad.platform}
          </span>
        </div>

        {/* Заголовок — 2 строки */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-sky-700 transition-colors mb-1.5">
          {ad.title}
        </h3>

        {/* Бюджет */}
        <p className="text-sm font-bold text-emerald-600 mb-0.5">
          {budget}
        </p>

        {/* Город + формат — без truncate, может переноситься */}
        <p className="text-[11px] text-gray-400 leading-snug">
          <EnvironmentOutlined className="text-[9px] mr-0.5" />
          {city}
          {videoFormatLabel && (
            <>
              <span className="mx-1 text-gray-300">·</span>
              <span className="text-blue-600 font-medium">{videoFormatLabel}</span>
            </>
          )}
        </p>
      </div>

      {/* Шеврон */}
      <ChevronRight
        size={16}
        className="shrink-0 mt-1 text-gray-300 group-hover:text-gray-400 transition-colors"
      />
    </Link>
  );
}
