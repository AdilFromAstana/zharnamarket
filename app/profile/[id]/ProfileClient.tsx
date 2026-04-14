"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Tag, Divider } from "antd";
import {
  EnvironmentOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  MobileOutlined,
  GlobalOutlined,
  UserOutlined,
  ShopOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  FlagOutlined,
} from "@ant-design/icons";
import { formatDate, formatBudgetPreview, getAvatarGradient, cn } from "@/lib/utils";
import type { Ad } from "@/lib/types/ad";
import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import ReportModal from "@/components/report/ReportModal";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface CreatorProfileSnippet {
  id: string;
  title: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  city: string;
  availability: string;
  verified: boolean;
  minimumRate: number;
  platforms: string[];
  contentCategories: string[];
}

interface ProfileData {
  id: string;
  displayName: string;
  isCompany: boolean;
  companyType: string | null;
  city: string | null;
  description: string | null;
  telegram: string | null;
  whatsapp: string | null;
  website: string | null;
  memberSince: string;
  verified: boolean;
  avatarColor?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ads: any[];
  creatorProfiles: CreatorProfileSnippet[];
}

interface ProfileClientProps {
  profile: ProfileData;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Готов к работе",
  busy: "Занят",
  partially_available: "Частично свободен",
};

const AVAILABILITY_COLORS: Record<string, string> = {
  available: "#22c55e",
  busy: "#ef4444",
  partially_available: "#f59e0b",
};

export default function ProfileClient({ profile }: ProfileClientProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const hasContacts = !!(
    profile.telegram ||
    profile.whatsapp ||
    profile.website
  );
  const hasAds = profile.ads.length > 0;
  const hasCreatorProfiles = profile.creatorProfiles.length > 0;

  const roleLabel = (() => {
    if (hasAds && hasCreatorProfiles)
      return { text: "Заказчик и мастер", color: "purple" as const };
    if (hasAds) return { text: "Заказчик", color: "blue" as const };
    if (hasCreatorProfiles)
      return { text: "Мастер контента", color: "green" as const };
    return { text: "Пользователь", color: "default" as const };
  })();

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5 md:gap-6 pb-10">
      {/* Назад — мобиль */}
      <div className="md:hidden">
        <Link href="/">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            size="small"
            className="-ml-1"
          >
            Назад
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ─── Сайдбар ─── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-24">
            {/* Аватар + имя */}
            <div className="text-center mb-4">
              <div className={cn("w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3 shadow-lg", profile.avatarColor ?? getAvatarGradient(profile.displayName))}>
                {profile.isCompany ? (
                  <ShopOutlined />
                ) : (
                  profile.displayName.charAt(0).toUpperCase()
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-1.5 flex-wrap">
                {profile.displayName}
                {profile.verified && <VerifiedBadge size={18} />}
              </h1>

              <div className="mt-1.5 flex justify-center">
                <Tag color={roleLabel.color} className="m-0 text-xs">
                  {roleLabel.text}
                </Tag>
              </div>

              {profile.city && (
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-gray-500">
                  <EnvironmentOutlined />
                  {ENUM_TO_CITY[profile.city] ?? profile.city}
                </div>
              )}
            </div>

            {/* Описание */}
            {profile.description && (
              <p className="text-sm text-gray-600 leading-relaxed text-center mb-4 border-t border-gray-100 pt-4">
                {profile.description}
              </p>
            )}

            <Divider />

            {/* Контакты */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Контакты
              </h3>

              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-sky-600 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors shrink-0">
                    <GlobalOutlined className="text-sky-500 text-sm" />
                  </span>
                  <span className="truncate">
                    {profile.website.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              )}

              {profile.telegram && (
                <a
                  href={`https://t.me/${profile.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-blue-600 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                    <SendOutlined className="text-blue-500 text-sm" />
                  </span>
                  <span className="truncate">{profile.telegram}</span>
                </a>
              )}

              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-green-600 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
                    <MobileOutlined className="text-green-500 text-sm" />
                  </span>
                  <span className="truncate">{profile.whatsapp}</span>
                </a>
              )}

              {!hasContacts && (
                <p className="text-sm text-gray-400">Контакты не указаны</p>
              )}
            </div>

            <Divider />

            {/* Мета-инфо */}
            <div className="space-y-2 text-sm">
              {profile.companyType && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Тип</span>
                  <span className="text-gray-800 font-medium">
                    {profile.companyType}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  <CalendarOutlined /> На платформе с
                </span>
                <span className="text-gray-800 font-medium text-right">
                  {formatDate(profile.memberSince)}
                </span>
              </div>
              {hasAds && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Заданий</span>
                  <span className="text-gray-800 font-medium">
                    {profile.ads.length}
                  </span>
                </div>
              )}
              {hasCreatorProfiles && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Анкет мастера</span>
                  <span className="text-gray-800 font-medium">
                    {profile.creatorProfiles.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Основной контент ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Анкеты мастера */}
          {hasCreatorProfiles && (
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TeamOutlined className="text-purple-500" />
                  Как мастер контента
                  <span className="text-gray-400 font-normal text-base">
                    ({profile.creatorProfiles.length})
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.creatorProfiles.map((cp) => {
                  const availColor =
                    AVAILABILITY_COLORS[cp.availability] ?? "#6b7280";
                  const availLabel =
                    AVAILABILITY_LABELS[cp.availability] ?? cp.availability;
                  return (
                    <Link
                      key={cp.id}
                      href={`/creators/${cp.id}`}
                      className="block group"
                    >
                      <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-base shrink-0", getAvatarGradient(cp.fullName))}>
                            {cp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                              {cp.title}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {cp.fullName}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: availColor }}
                              />
                              <span
                                className="text-xs"
                                style={{ color: availColor }}
                              >
                                {availLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                        {cp.bio && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {cp.bio}
                          </p>
                        )}
                        {cp.minimumRate > 0 && (
                          <div className="mt-2 text-xs text-gray-400">
                            от{" "}
                            <span className="font-semibold text-gray-700">
                              {cp.minimumRate.toLocaleString("ru-RU")} ₸
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Активные задания */}
          {hasAds ? (
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileTextOutlined className="text-sky-500" />
                  Активные задания
                  <span className="text-gray-400 font-normal text-base">
                    ({profile.ads.length})
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ищет создателей контента
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.ads.map((ad) => (
                  <Link
                    key={ad.id}
                    href={`/ads/${ad.id}`}
                    className="block group"
                  >
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-sky-300 hover:shadow-sm transition-all">
                      <h3 className="font-semibold text-sm text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-2 mb-2">
                        {ad.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-xs bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">
                          {ad.platform}
                        </span>
                        <span className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">
                          {ENUM_TO_CATEGORY[ad.category] ?? ad.category}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <EnvironmentOutlined />
                        {ENUM_TO_CITY[ad.city] ?? ad.city}
                      </div>
                      {(ad.budgetFrom || ad.budgetTo || ad.budgetDetails) && (
                        <div className="mt-2 text-xs text-gray-500">
                          Бюджет:{" "}
                          <span className="font-semibold text-gray-800">
                            {formatBudgetPreview(
                              ad.budgetType,
                              ad.budgetFrom,
                              ad.budgetTo,
                              ad.budgetDetails,
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : !hasCreatorProfiles ? (
            /* Пустой стейт — ничего нет */
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <UserOutlined className="text-5xl text-gray-300 mb-3 block" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                Нет публичной активности
              </h3>
              <p className="text-sm text-gray-400">
                Пользователь ещё не разместил заданий и не создал анкету
              </p>
            </div>
          ) : null}

          {/* Нет заданий, но есть анкета мастера */}
          {!hasAds && hasCreatorProfiles && (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-400">
                Этот пользователь не размещает задания
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Пожаловаться — внизу, без акцента */}
      <div className="text-center pb-2">
        <button
          onClick={() => setReportOpen(true)}
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors inline-flex items-center gap-1"
        >
          <FlagOutlined />
          Пожаловаться
        </button>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="customer"
        targetId={profile.id}
      />
    </div>
  );
}
