"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spin, Tag } from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  TeamOutlined,
  DollarOutlined,
  TagOutlined,
  WarningOutlined,
  RightOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api } from "@/lib/api-client";
import { formatPrice, formatDate } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  activeAds: number;
  publishedCreators: number;
  monthlyRevenue: number;
  totalPromoCodes: number;
  activePromoCodes: number;
  recentPayments: Array<{
    id: string;
    type: string;
    amount: number;
    method: string;
    createdAt: string;
    user: { id: string; name: string; email: string };
    ad: { id: string; title: string } | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ad_publication: "Публикация",
  ad_boost: "Буст",
  creator_publication: "Профиль",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  kaspi: "Kaspi",
  halyk: "Halyk",
  card: "Карта",
};

export default function AdminDashboardPage() {
  const { isLoading: authLoading } = useRequireAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    api
      .get<Stats>("/api/admin/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Не удалось загрузить статистику</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Пользователей",
      value: stats.totalUsers,
      icon: <UserOutlined className="text-xl" />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Активных объявлений",
      value: stats.activeAds,
      icon: <FileTextOutlined className="text-xl" />,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Креаторов опубликовано",
      value: stats.publishedCreators,
      icon: <TeamOutlined className="text-xl" />,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Доход за месяц",
      value: formatPrice(stats.monthlyRevenue),
      icon: <DollarOutlined className="text-xl" />,
      color: "bg-amber-50 text-amber-600",
      isPrice: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Админ-панель</h1>
          <p className="text-sm text-gray-500 mt-1">
            Обзор платформы и управление
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-200 p-5"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${card.color} mb-3`}>
                {card.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {card.isPrice ? card.value : Number(card.value).toLocaleString("ru")}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/admin/users"
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserOutlined className="text-xl" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Пользователи</div>
                <div className="text-sm text-gray-500">
                  Управление, блокировка, роли
                </div>
              </div>
            </div>
            <RightOutlined className="text-gray-400 group-hover:text-blue-500 transition-colors" />
          </Link>

          <Link
            href="/admin/promo"
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-sky-300 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <TagOutlined className="text-xl" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Промокоды</div>
                <div className="text-sm text-gray-500">
                  {stats.activePromoCodes} активных из {stats.totalPromoCodes}
                </div>
              </div>
            </div>
            <RightOutlined className="text-gray-400 group-hover:text-sky-500 transition-colors" />
          </Link>

          <Link
            href="/admin/moderation"
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileTextOutlined className="text-xl" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Модерация</div>
                <div className="text-sm text-gray-500">
                  Объявления и профили креаторов
                </div>
              </div>
            </div>
            <RightOutlined className="text-gray-400 group-hover:text-purple-500 transition-colors" />
          </Link>

          <Link
            href="/admin/reports"
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-red-300 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <WarningOutlined className="text-xl" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Жалобы</div>
                <div className="text-sm text-gray-500">
                  Просмотр и обработка жалоб
                </div>
              </div>
            </div>
            <RightOutlined className="text-gray-400 group-hover:text-red-500 transition-colors" />
          </Link>

          <Link
            href="/admin/categories"
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <AppstoreOutlined className="text-xl" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Категории</div>
                <div className="text-sm text-gray-500">
                  Форматы видео, рекламы, типы рекламируемого
                </div>
              </div>
            </div>
            <RightOutlined className="text-gray-400 group-hover:text-teal-500 transition-colors" />
          </Link>

          <Link
            href="/admin/promo/new"
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-sky-300 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <TagOutlined className="text-xl" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  Создать промокод
                </div>
                <div className="text-sm text-gray-500">
                  Бесплатная публикация или скидка
                </div>
              </div>
            </div>
            <RightOutlined className="text-gray-400 group-hover:text-sky-500 transition-colors" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent payments */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              Последние платежи
            </h2>
            {stats.recentPayments.length === 0 ? (
              <p className="text-sm text-gray-400">Платежей пока нет</p>
            ) : (
              <div className="space-y-3">
                {stats.recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {p.user.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {PAYMENT_TYPE_LABELS[p.type] ?? p.type}{" "}
                        · {PAYMENT_METHOD_LABELS[p.method] ?? p.method}{" "}
                        · {formatDate(p.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 shrink-0 ml-3">
                      {formatPrice(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent users */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              Новые пользователи
            </h2>
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-gray-400">Пользователей нет</p>
            ) : (
              <div className="space-y-3">
                {stats.recentUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {u.name}
                        </span>
                        {u.role === "admin" && (
                          <Tag color="gold" className="!text-xs !px-1.5 !py-0 !m-0">
                            admin
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0 ml-3">
                      {formatDate(u.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
