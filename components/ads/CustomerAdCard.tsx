"use client";

import Link from "next/link";
import { Tag } from "antd";
import {
  EnvironmentOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { Ad } from "@/lib/types/ad";
import { PLATFORM_BADGE_CLASSES } from "@/lib/constants";
import { cn, formatBudgetPreview, formatRelative } from "@/lib/utils";

interface CustomerAdCardProps {
  ad: Ad;
  className?: string;
}

/**
 * Карточка объявления для страницы профиля заказчика /customers/[id].
 * Не показывает имя компании (оно уже в шапке страницы).
 * Показывает статус объявления и метрики просмотров.
 */
export default function CustomerAdCard({ ad, className }: CustomerAdCardProps) {
  const isActive = ad.status === "active";

  return (
    <Link
      href={`/ads/${ad.id}`}
      className={cn("block group h-full", className)}
    >
      <div
        className={cn(
          "bg-white border rounded-2xl p-4 flex flex-col gap-3 h-full transition-all duration-200 hover:shadow-md hover:border-gray-300",
          isActive ? "border-gray-200" : "border-gray-100 opacity-80",
        )}
      >
        {/* Платформа */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${PLATFORM_BADGE_CLASSES[ad.platform] ?? "bg-gray-800 text-white"}`}
          >
            {ad.platform}
          </span>
        </div>

        {/* Заголовок */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-sky-700 transition-colors flex-1">
          {ad.title}
        </h3>

        {/* Категория */}
        <div>
          <Tag className="text-xs m-0">{ad.category}</Tag>
        </div>

        {/* Бюджет */}
        <div className="text-base font-bold text-green-700">
          {formatBudgetPreview(
            ad.budgetType,
            ad.budgetFrom,
            ad.budgetTo,
            ad.budgetDetails,
          )}
        </div>

        {/* Город + метрики */}
        <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1 truncate">
            <EnvironmentOutlined className="shrink-0" />
            <span className="truncate">{ad.city}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <EyeOutlined />
            {ad.metadata.viewCount}
          </span>
        </div>

        {/* Дата публикации */}
        {ad.publishedAt && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <ClockCircleOutlined />
            <span>{formatRelative(ad.publishedAt)}</span>
          </div>
        )}

        {/* Ссылка */}
        <div className="mt-auto pt-1">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 group-hover:text-sky-700 transition-colors">
            Подробнее
            <ArrowRightOutlined className="text-[10px] transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
