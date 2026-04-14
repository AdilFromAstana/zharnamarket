"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button, Tag, Spin } from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  UserOutlined,
  EditOutlined,
  SearchOutlined,
  BarsOutlined,
  SmileOutlined,
  CreditCardOutlined,
  TagOutlined,
  StarFilled,
  EyeOutlined,
  MessageOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  UnorderedListOutlined,
  ArrowRightOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import PublicLayout from "@/components/layout/PublicLayout";
import type { Ad } from "@/lib/types/ad";
import type { CreatorProfile } from "@/lib/types/creator";
import { AVAILABILITY_COLORS, AVAILABILITY_LABELS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { formatPrice, formatRelative } from "@/lib/utils";
import StarRating from "@/components/reviews/StarRating";

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface PaymentRecord {
  id: string;
  type: string;
  amount: number;
  originalAmount: number | null;
  discountAmount: number | null;
  method: string;
  status: string;
  boostType: string | null;
  createdAt: string;
  promoCode: {
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
  ad: { id: string; title: string } | null;
}

interface MyReview {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  createdAt: string;
  reviewer?: { id: string; name: string; avatar: string | null };
  creatorProfile?: { id: string; title: string; fullName: string } | null;
}

interface MyReviewsData {
  written: MyReview[];
  received: MyReview[];
}

export default function CabinetPage() {
  // Защита страницы — редирект если не авторизован
  const { user: authUser, isLoading: authLoading } = useRequireAuth();

  const [user, setUser] = useState<UserData | null>(null);
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [myProfiles, setMyProfiles] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [myReviews, setMyReviews] = useState<MyReviewsData>({
    written: [],
    received: [],
  });
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    // Не загружаем данные пока не проверена авторизация
    if (authLoading || !authUser) return;

    const load = async () => {
      setLoading(true);
      try {
        const [
          userData,
          adsData,
          profilesData,
          paymentsData,
          reviewsData,
          balanceData,
        ] = await Promise.all([
          api.get<UserData>("/api/users/me"),
          api.get<Ad[]>("/api/tasks/my?status=active").catch(() => [] as Ad[]),
          api
            .get<CreatorProfile[]>("/api/creators/my")
            .catch(() => [] as CreatorProfile[]),
          api
            .get<{ data: PaymentRecord[] }>("/api/payments/history")
            .catch(() => ({ data: [] })),
          api
            .get<MyReviewsData>("/api/reviews/my")
            .catch(() => ({ written: [], received: [] }) as MyReviewsData),
          api
            .get<{ balance: { current: number } }>("/api/balance")
            .catch(() => ({ balance: { current: 0 } })),
        ]);
        setUser(userData);
        setMyAds((adsData as Ad[]).slice(0, 3));
        setMyProfiles(profilesData as CreatorProfile[]);
        setPayments((paymentsData as { data: PaymentRecord[] }).data ?? []);
        setMyReviews(reviewsData as MyReviewsData);
        setWalletBalance(
          (balanceData as { balance: { current: number } }).balance.current,
        );
      } catch {
        // ошибка — данные не загружены
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, authUser]);

  // Показываем спиннер пока проверяется авторизация
  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  const activeAdsCount = myAds.filter((a) => a.status === "active").length;
  const publishedProfilesCount = myProfiles.filter((p) => p.isPublished).length;
  const totalViews = myAds.reduce(
    (sum, a) => sum + (a.metadata?.viewCount ?? 0),
    0,
  );
  const totalContacts = myAds.reduce(
    (sum, a) => sum + (a.metadata?.contactClickCount ?? 0),
    0,
  );

  const displayName =
    user?.name?.split(" ")[0] ?? authUser?.name?.split(" ")[0] ?? "—";

  return (
    <PublicLayout>
      {/* ── Секция 1: Hero + Кошелёк ── */}
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-2xl border border-sky-100 p-5 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Приветствие */}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <SmileOutlined style={{ color: "#0ea5e9" }} /> Привет,{" "}
              {displayName}!
            </h1>
            <p className="text-gray-500 text-sm">{user?.email ?? ""}</p>
          </div>

          {/* Кошелёк */}
          <div className="flex items-center gap-4 md:gap-5 bg-white/70 rounded-xl p-3 md:p-4 border border-sky-100/50">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <WalletOutlined /> Баланс
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-none">
                {walletBalance === null
                  ? "—"
                  : walletBalance.toLocaleString("ru")}{" "}
                <span className="text-base font-semibold text-gray-400">₸</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/balance/topup">
                <Button
                  type="primary"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
                >
                  Пополнить
                </Button>
              </Link>
              <Link href="/balance">
                <Button size="small" icon={<UnorderedListOutlined />}>
                  Операции
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Секция 2: Статистика ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Активных заданий",
            value: activeAdsCount,
            bg: "bg-green-500 border-green-600",
            icon: (
              <FileTextOutlined style={{ color: "rgba(255,255,255,0.8)" }} />
            ),
          },
          {
            label: "Профилей",
            value: publishedProfilesCount,
            bg: "bg-violet-500 border-violet-600",
            icon: <UserOutlined style={{ color: "rgba(255,255,255,0.8)" }} />,
          },
          {
            label: "Просмотров",
            value: totalViews,
            bg: "bg-sky-500 border-sky-600",
            icon: <EyeOutlined style={{ color: "rgba(255,255,255,0.8)" }} />,
          },
          {
            label: "Обращений",
            value: totalContacts,
            bg: "bg-amber-500 border-amber-600",
            icon: (
              <MessageOutlined style={{ color: "rgba(255,255,255,0.8)" }} />
            ),
          },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-xs text-white/80">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Секция 3: Мои задания + Мои профили ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Блок: Мои задания */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <FileTextOutlined style={{ color: "#0284c7", fontSize: 18 }} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Мои задания</h2>
                <p className="text-xs text-gray-400">
                  Объявления для поиска креаторов
                </p>
              </div>
            </div>
            {myAds.length > 0 && (
              <Tag color="blue">{activeAdsCount} активных</Tag>
            )}
          </div>

          {myAds.length > 0 ? (
            <div className="flex-1">
              <div className="space-y-2 mb-4">
                {myAds.slice(0, 2).map((ad) => (
                  <div
                    key={ad.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {ad.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            ad.status === "active"
                              ? "bg-green-500"
                              : ad.status === "paused"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                          }`}
                        />
                        <span className="text-xs text-gray-500">
                          {ad.status === "active"
                            ? "Активно"
                            : ad.status === "paused"
                              ? "На паузе"
                              : ad.status === "expired"
                                ? "Истекло"
                                : ad.status}
                        </span>
                        {ad.metadata?.viewCount > 0 && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">
                              <EyeOutlined className="mr-0.5" />
                              {ad.metadata.viewCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link href={`/ads/${ad.id}/edit`}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                      />
                    </Link>
                  </div>
                ))}
              </div>
              <Link href="/ads/manage">
                <Button type="text" size="small" className="text-sky-600">
                  Все задания <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
                <FileTextOutlined style={{ color: "#0ea5e9", fontSize: 24 }} />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                У вас ещё нет заданий
              </p>
              <p className="text-gray-400 text-xs text-center max-w-[220px]">
                Создайте задание — получите прямые обращения от креаторов
              </p>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-gray-100">
            <Link href="/ads/new" className="w-full block">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
              >
                Создать задание
              </Button>
            </Link>
          </div>
        </div>

        {/* Блок: Мои профили */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <UserOutlined style={{ color: "#9333ea", fontSize: 18 }} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Мои профили</h2>
                <p className="text-xs text-gray-400">
                  Анкеты в каталоге креаторов
                </p>
              </div>
            </div>
            {myProfiles.length > 0 && (
              <Tag color="purple">{publishedProfilesCount} опубликовано</Tag>
            )}
          </div>

          {myProfiles.length > 0 ? (
            <div className="flex-1">
              <div className="space-y-2 mb-4">
                {myProfiles.slice(0, 2).map((profile) => {
                  const availabilityColor =
                    AVAILABILITY_COLORS[profile.availability];
                  const availabilityLabel =
                    AVAILABILITY_LABELS[profile.availability];
                  return (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          <FileTextOutlined
                            style={{ color: "#9ca3af" }}
                            className="shrink-0"
                          />{" "}
                          {profile.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: availabilityColor }}
                          />
                          <span
                            className="text-xs"
                            style={{ color: availabilityColor }}
                          >
                            {availabilityLabel}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">
                            {profile.isPublished ? "Опубликован" : "Черновик"}
                          </span>
                        </div>
                      </div>
                      <Link href={`/creators/edit?id=${profile.id}`}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                        />
                      </Link>
                    </div>
                  );
                })}
              </div>
              <Link href="/creators/manage">
                <Button type="text" size="small" className="text-purple-600">
                  Все профили <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
                <UserOutlined style={{ color: "#a855f7", fontSize: 24 }} />
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                Нет профилей
              </p>
              <p className="text-gray-400 text-xs text-center max-w-[220px]">
                Создайте профиль — бизнес сам найдёт вас в каталоге
              </p>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-gray-100">
            <Link href="/creators/new" className="w-full block">
              <Button icon={<PlusOutlined />} block>
                {myProfiles.length > 0 ? "Добавить профиль" : "Создать профиль"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Секция 4: Последние операции ── */}
      {payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CreditCardOutlined
                  style={{ color: "#16a34a", fontSize: 18 }}
                />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  Последние операции
                </h2>
                <p className="text-xs text-gray-400">Недавние транзакции</p>
              </div>
            </div>
            <Link href="/balance">
              <Button type="text" size="small" className="text-sky-600">
                Все операции <ArrowRightOutlined />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {payments.slice(0, 3).map((p) => {
              const typeLabel =
                p.type === "ad_publication"
                  ? "Публикация задания"
                  : p.type === "ad_boost"
                    ? `Буст задания: ${p.boostType ?? ""}`
                    : p.type === "creator_publication"
                      ? "Публикация профиля"
                      : p.type === "creator_boost"
                        ? `Буст профиля: ${p.boostType ?? ""}`
                        : p.type;
              const hasDiscount =
                p.promoCode && p.originalAmount && p.discountAmount;
              return (
                <div
                  key={p.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {typeLabel}
                    </div>
                    {p.ad && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {p.ad.title}
                      </div>
                    )}
                    {hasDiscount && (
                      <div className="flex items-center gap-1 mt-1">
                        <TagOutlined
                          style={{ color: "#22c55e", fontSize: 12 }}
                        />
                        <span className="text-xs text-green-600 font-medium">
                          {p.promoCode!.code} −{formatPrice(p.discountAmount!)}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    {hasDiscount ? (
                      <>
                        <div className="text-xs text-gray-400 line-through">
                          {formatPrice(p.originalAmount!)}
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatPrice(p.amount)}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-bold text-gray-900">
                        {formatPrice(p.amount)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Секция 5: Мои отзывы ── */}
      {(myReviews.written.length > 0 || myReviews.received.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <StarFilled style={{ color: "#f59e0b", fontSize: 18 }} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Мои отзывы</h2>
              <p className="text-xs text-gray-400">
                {myReviews.written.length > 0 &&
                  `Написано: ${myReviews.written.length}`}
                {myReviews.written.length > 0 &&
                  myReviews.received.length > 0 &&
                  " · "}
                {myReviews.received.length > 0 &&
                  `Получено: ${myReviews.received.length}`}
              </p>
            </div>
          </div>

          {/* Написанные мной отзывы */}
          {myReviews.written.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                Мои отзывы
              </h3>
              <div className="space-y-2">
                {myReviews.written.slice(0, 3).map((review) => (
                  <Link
                    key={review.id}
                    href={
                      review.creatorProfile
                        ? `/creators/${review.creatorProfile.id}`
                        : "#"
                    }
                  >
                    <div className="flex items-start justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {review.creatorProfile?.fullName ?? "Креатор"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-xs text-gray-400">
                            {formatRelative(review.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Полученные отзывы */}
          {myReviews.received.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                Отзывы обо мне
              </h3>
              <div className="space-y-2">
                {myReviews.received.slice(0, 3).map((review) => (
                  <div
                    key={review.id}
                    className="flex items-start justify-between p-3 rounded-xl bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {review.reviewer?.name ?? "Пользователь"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs text-gray-400">
                          {formatRelative(review.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {review.comment}
                      </p>
                      {review.reply && (
                        <p className="text-xs text-sky-600 mt-0.5 line-clamp-1">
                          Ваш ответ: {review.reply}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Секция 6: Быстрые действия ── */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl border border-sky-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">
          Что хотите сделать?
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {myAds.length === 0 ? (
            <Link href="/ads/new">
              <div className="bg-white rounded-xl p-3 text-center hover:shadow-sm transition-shadow cursor-pointer border border-sky-200 ring-1 ring-sky-100">
                <div className="text-2xl mb-1 flex justify-center">
                  <PlusOutlined style={{ color: "#0ea5e9" }} />
                </div>
                <div className="text-xs font-medium text-sky-700">
                  Создать задание
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/ads/manage">
              <div className="bg-white rounded-xl p-3 text-center hover:shadow-sm transition-shadow cursor-pointer border border-gray-100">
                <div className="text-2xl mb-1 flex justify-center">
                  <BarsOutlined style={{ color: "#0ea5e9" }} />
                </div>
                <div className="text-xs font-medium text-gray-700">
                  Управление заданиями
                </div>
              </div>
            </Link>
          )}
          <Link href="/creators">
            <div className="bg-white rounded-xl p-3 text-center hover:shadow-sm transition-shadow cursor-pointer border border-gray-100">
              <div className="text-2xl mb-1 flex justify-center">
                <SearchOutlined style={{ color: "#0ea5e9" }} />
              </div>
              <div className="text-xs font-medium text-gray-700">
                Найти креатора
              </div>
            </div>
          </Link>
          <Link href="/ads">
            <div className="bg-white rounded-xl p-3 text-center hover:shadow-sm transition-shadow cursor-pointer border border-gray-100">
              <div className="text-2xl mb-1 flex justify-center">
                <RocketOutlined style={{ color: "#0ea5e9" }} />
              </div>
              <div className="text-xs font-medium text-gray-700">
                Смотреть задания
              </div>
            </div>
          </Link>
          {myProfiles.length === 0 ? (
            <Link href="/creators/new">
              <div className="bg-white rounded-xl p-3 text-center hover:shadow-sm transition-shadow cursor-pointer border border-purple-200 ring-1 ring-purple-100">
                <div className="text-2xl mb-1 flex justify-center">
                  <PlusOutlined style={{ color: "#a855f7" }} />
                </div>
                <div className="text-xs font-medium text-purple-700">
                  Создать профиль
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/creators/manage">
              <div className="bg-white rounded-xl p-3 text-center hover:shadow-sm transition-shadow cursor-pointer border border-gray-100">
                <div className="text-2xl mb-1 flex justify-center">
                  <UserOutlined style={{ color: "#0ea5e9" }} />
                </div>
                <div className="text-xs font-medium text-gray-700">
                  Мои профили
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
