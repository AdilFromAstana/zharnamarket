"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import {
  EnvironmentOutlined,
  SendOutlined,
  FileTextOutlined,
  MobileOutlined,
} from "@ant-design/icons";
import type { CreatorProfile } from "@/lib/types/creator";
import {
  formatFollowers,
  formatRelative,
  formatDate,
  isRecentlyActive,
  getAvatarGradient,
  cn,
} from "@/lib/utils";
import {
  PLATFORM_COLORS,
  PLATFORM_BADGE_CLASSES,
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
} from "@/lib/constants";
import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import StarRating from "@/components/reviews/StarRating";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import PlatformIcon from "./PlatformIcon";
import { api } from "@/lib/api-client";

interface CreatorProfileSidebarProps {
  creator: CreatorProfile;
  contactChannels: string[];
  onContactClick: () => void;
}

export default function CreatorProfileSidebar({
  creator,
  contactChannels,
  onContactClick,
}: CreatorProfileSidebarProps) {
  const availabilityColor = AVAILABILITY_COLORS[creator.availability];
  const availabilityLabel = AVAILABILITY_LABELS[creator.availability];
  const online = isRecentlyActive(creator.metadata.lastActiveAt);

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(creator.metadata.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const isNewCreator = daysSinceCreated < 30;

  const lastActiveMs =
    Date.now() - new Date(creator.metadata.lastActiveAt).getTime();
  const responseHint = online
    ? "Обычно отвечает быстро"
    : lastActiveMs < 3 * 60 * 60 * 1000
      ? "Обычно отвечает в течение часа"
      : null;

  const primaryChannel = contactChannels[0];
  const ctaLabel =
    primaryChannel === "Telegram"
      ? "Написать в Telegram"
      : primaryChannel === "WhatsApp"
        ? "Написать в WhatsApp"
        : primaryChannel === "Телефон"
          ? "Позвонить"
          : primaryChannel === "Email"
            ? "Написать на Email"
            : "Связаться";

  const viewsItems = creator.portfolio.filter((p) => p.views);
  const avgViews =
    viewsItems.length > 0
      ? Math.round(
          viewsItems.reduce((s, p) => s + (p.views ?? 0), 0) /
            viewsItems.length,
        )
      : null;

  const [viewsLast30, setViewsLast30] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ last30Days: number | null }>(
        `/api/creators/${creator.id}/view-stats/public`,
      )
      .then((res) => {
        if (!cancelled) setViewsLast30(res.last30Days);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [creator.id]);

  return (
    <div className="lg:col-span-1">
      <div className="lg:bg-white lg:rounded-2xl lg:border lg:border-gray-200 lg:p-6 lg:sticky lg:top-24">
        {/* Avatar */}
        <div className="text-center mb-4">
          {creator.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={creator.avatar}
              alt={creator.fullName}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
            />
          ) : (
            <div
              className={cn(
                "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3",
                creator.avatarColor ?? getAvatarGradient(creator.fullName),
              )}
            >
              {creator.fullName.charAt(0)}
            </div>
          )}

          {/* Title badge */}
          <div className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2.5 py-1 rounded-full mb-2">
            <FileTextOutlined className="text-sky-500" /> {creator.title}
          </div>

          <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-1.5">
            {creator.fullName}
            {creator.verified && <VerifiedBadge size={18} />}
          </h1>

          {creator.username && (
            <p className="text-gray-500 text-sm mt-0.5">{creator.username}</p>
          )}

          {/* Meta tag strip */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 mb-1">
            {creator.platforms.map((p) => (
              <span
                key={p.name}
                className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${PLATFORM_BADGE_CLASSES[p.name] ?? "bg-gray-800 text-white"}`}
              >
                {p.name}
              </span>
            ))}
            {creator.contentCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-50 text-violet-700"
              >
                {ENUM_TO_CATEGORY[cat] ?? cat}
              </span>
            ))}
          </div>

          {/* City + status + last active */}
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <EnvironmentOutlined />
              {ENUM_TO_CITY[creator.city] ?? creator.city}
            </span>
            <span
              className="flex items-center gap-1"
              style={{ color: availabilityColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: availabilityColor }}
              />
              {availabilityLabel}
            </span>
            {online ? (
              <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Онлайн
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Офлайн · {formatRelative(creator.metadata.lastActiveAt)}
              </span>
            )}
          </div>

          {/* Registration date — только для проверенных временем */}
          {!isNewCreator && (
            <div className="hidden md:flex items-center justify-center gap-2 mt-1.5 text-xs text-gray-400 flex-wrap">
              <span>
                На платформе с {formatDate(creator.metadata.createdAt)}
              </span>
            </div>
          )}

          {/* Rating */}
          {creator.reviewCount > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <StarRating
                rating={creator.averageRating}
                size="sm"
                showValue
              />
              <span className="text-xs text-gray-400">
                ({creator.reviewCount}{" "}
                {creator.reviewCount === 1
                  ? "отзыв"
                  : creator.reviewCount < 5
                    ? "отзыва"
                    : "отзывов"}
                )
              </span>
            </div>
          )}

          {/* Бейдж "Новый на платформе" — продаёт отсутствие отзывов */}
          {isNewCreator && creator.reviewCount === 0 && (
            <div className="inline-flex items-center gap-1.5 mt-3 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Новый на платформе · оплата через escrow
            </div>
          )}
        </div>

        {/* Stats */}
        {((creator.stats && creator.stats.completedOrders > 0) ||
          avgViews !== null ||
          (viewsLast30 !== null && viewsLast30 > 0)) && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Статистика
            </h3>
            <div className="flex flex-col gap-2">
              {creator.stats && creator.stats.completedOrders > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Заказов выполнено
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {creator.stats.completedOrders}
                  </span>
                </div>
              )}
              {avgViews !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Ср. просмотров / ролик
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatFollowers(avgViews)}
                  </span>
                </div>
              )}
              {creator.stats?.successRate !== null &&
                creator.stats?.successRate !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Успешных сдач</span>
                    <span className="text-sm font-bold text-green-600">
                      {creator.stats.successRate}%
                    </span>
                  </div>
                )}
              {viewsLast30 !== null && viewsLast30 > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Просмотров профиля за 30 дней
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {viewsLast30}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {creator.bio && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">О себе</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {creator.bio}
            </p>
          </div>
        )}

        {/* Pricing */}
        {creator.pricing.items && creator.pricing.items.length > 0 ? (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Прайс-лист
            </h3>
            <div className="flex flex-col gap-2">
              {creator.pricing.items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 p-3 flex items-start justify-between gap-3 hover:border-sky-200 hover:bg-sky-50/30 transition-colors"
                >
                  <span className="text-sm text-gray-700 leading-snug">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900 shrink-0 whitespace-nowrap">
                    {item.price.toLocaleString("ru-KZ")} ₸
                  </span>
                </div>
              ))}
            </div>
            {creator.pricing.negotiable && (
              <p className="text-xs text-gray-400 mt-2">
                Цены ориентировочные, обсуждаются
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Ставка</h3>
            <div className="text-2xl font-bold text-gray-900">
              от {creator.pricing.minimumRate.toLocaleString("ru-KZ")} ₸
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {creator.pricing.negotiable
                ? "Договорная · за публикацию"
                : "За публикацию"}
            </p>
          </div>
        )}

        {/* Contact button — desktop only */}
        <div className="hidden md:block mt-5 pt-5 border-t border-gray-100">
          <Button
            type="primary"
            block
            size="large"
            icon={<SendOutlined />}
            onClick={onContactClick}
            style={{
              height: 48,
              background: "#0EA5E9",
              borderColor: "#0EA5E9",
            }}
          >
            {ctaLabel}
          </Button>
          {responseHint && (
            <p className="text-xs text-green-600 text-center mt-2 font-medium">
              {responseHint}
            </p>
          )}
          {contactChannels.length > 1 && (
            <p className="text-xs text-gray-400 text-center mt-1 flex items-center justify-center gap-1">
              <MobileOutlined /> также {contactChannels.slice(1).join(" · ")}
            </p>
          )}
        </div>

        {/* Platforms */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Платформы
          </h3>
          <div className="flex flex-col gap-2.5">
            {creator.platforms.map((p) => {
              const inner = (
                <>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ background: PLATFORM_COLORS[p.name] }}
                  >
                    <PlatformIcon name={p.name} />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs text-gray-400 leading-none">
                      {p.name}
                    </span>
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: PLATFORM_COLORS[p.name] }}
                    >
                      {p.handle || `@${p.name.toLowerCase()}`}
                    </span>
                  </div>
                  {typeof p.followers === "number" && p.followers > 0 && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatFollowers(p.followers)}
                    </span>
                  )}
                </>
              );
              return p.url ? (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={p.name}
                  className="flex items-center gap-2.5 text-sm text-gray-700"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
