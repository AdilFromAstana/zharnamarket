"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button, Tag, Spin, Tabs } from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  UserOutlined,
  EditOutlined,
  SmileOutlined,
  CreditCardOutlined,
  TagOutlined,
  StarFilled,
  EyeOutlined,
  MessageOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import type { Ad } from "@/lib/types/ad";
import type { CreatorProfile } from "@/lib/types/creator";
import { AVAILABILITY_COLORS, AVAILABILITY_LABELS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { formatPrice, formatRelative } from "@/lib/utils";
import StarRating from "@/components/reviews/StarRating";
import TopupDrawer from "@/components/balance/TopupDrawer";

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
  const [topupOpen, setTopupOpen] = useState(false);

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
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
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
    <>
      {/* ── Секция 1: Приветствие ── */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-0.5 flex items-center gap-2">
          <SmileOutlined style={{ color: "#0ea5e9" }} /> Привет,{" "}
          {displayName}!
        </h1>
        <p className="text-gray-500 text-sm">{user?.email ?? ""}</p>
      </div>

      {/* ── Секция 2: Кошелёк ── */}
      <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 p-5 md:p-6 text-white shadow-sm">
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none"
          aria-hidden
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70 mb-1 flex items-center gap-1.5">
              <WalletOutlined /> Баланс
            </p>
            <p className="text-3xl md:text-4xl font-bold leading-none">
              {walletBalance === null
                ? "—"
                : walletBalance.toLocaleString("ru")}{" "}
              <span className="text-xl md:text-2xl font-semibold text-white/70">
                ₸
              </span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="large"
              icon={<ArrowUpOutlined />}
              onClick={() => setTopupOpen(true)}
              style={{
                background: "#fff",
                borderColor: "#fff",
                color: "#0369a1",
                fontWeight: 600,
              }}
            >
              Пополнить
            </Button>
            <Link href="/cabinet/balance">
              <Button
                size="large"
                ghost
                style={{ borderColor: "rgba(255,255,255,0.6)", color: "#fff" }}
              >
                Операции
              </Button>
            </Link>
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
            href: "/ads/manage",
            icon: (
              <FileTextOutlined style={{ color: "rgba(255,255,255,0.8)" }} />
            ),
          },
          {
            label: "Профилей",
            value: publishedProfilesCount,
            bg: "bg-violet-500 border-violet-600",
            href: "/creators/manage",
            icon: <UserOutlined style={{ color: "rgba(255,255,255,0.8)" }} />,
          },
          {
            label: "Просмотров",
            value: totalViews,
            bg: "bg-sky-500 border-sky-600",
            href: "/ads/manage",
            icon: <EyeOutlined style={{ color: "rgba(255,255,255,0.8)" }} />,
          },
          {
            label: "Обращений",
            value: totalContacts,
            bg: "bg-amber-500 border-amber-600",
            href: "/ads/manage",
            icon: (
              <MessageOutlined style={{ color: "rgba(255,255,255,0.8)" }} />
            ),
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-xl border p-3 md:p-4 ${stat.bg} transition-transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-xs text-white/80">{stat.label}</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-white leading-tight">
              {stat.value}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Секция 3: Активность (табы) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mb-6">
        <Tabs
          size="middle"
          defaultActiveKey={
            myAds.length > 0
              ? "ads"
              : myProfiles.length > 0
                ? "profiles"
                : "ads"
          }
          items={[
            {
              key: "ads",
              label: (
                <span className="flex items-center gap-1.5">
                  <FileTextOutlined /> Задания
                  {myAds.length > 0 && (
                    <Tag color="blue" className="!ml-1 !mr-0">
                      {activeAdsCount}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div>
                  {myAds.length > 0 ? (
                    <>
                      <div className="space-y-2 mb-4">
                        {myAds.slice(0, 3).map((ad) => (
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
                                    <span className="text-xs text-gray-300">
                                      ·
                                    </span>
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
                      <div className="flex items-center justify-between gap-2">
                        <Link href="/ads/manage">
                          <Button type="text" size="small" className="text-sky-600">
                            Все задания <ArrowRightOutlined />
                          </Button>
                        </Link>
                        <Link href="/ads/new">
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{
                              background: "#0EA5E9",
                              borderColor: "#0EA5E9",
                            }}
                          >
                            Создать задание
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
                        <FileTextOutlined
                          style={{ color: "#0ea5e9", fontSize: 24 }}
                        />
                      </div>
                      <p className="text-gray-500 text-sm font-medium mb-1">
                        У вас ещё нет заданий
                      </p>
                      <p className="text-gray-400 text-xs text-center max-w-[260px] mb-4">
                        Создайте задание — получите прямые обращения от креаторов
                      </p>
                      <Link href="/ads/new">
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          style={{
                            background: "#0EA5E9",
                            borderColor: "#0EA5E9",
                          }}
                        >
                          Создать задание
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "profiles",
              label: (
                <span className="flex items-center gap-1.5">
                  <UserOutlined /> Профили
                  {myProfiles.length > 0 && (
                    <Tag color="purple" className="!ml-1 !mr-0">
                      {publishedProfilesCount}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div>
                  {myProfiles.length > 0 ? (
                    <>
                      <div className="space-y-2 mb-4">
                        {myProfiles.slice(0, 3).map((profile) => {
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
                                <div className="text-sm font-medium truncate">
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
                                  <span className="text-xs text-gray-400">
                                    ·
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {profile.isPublished
                                      ? "Опубликован"
                                      : "Черновик"}
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
                      <div className="flex items-center justify-between gap-2">
                        <Link href="/creators/manage">
                          <Button
                            type="text"
                            size="small"
                            className="text-purple-600"
                          >
                            Все профили <ArrowRightOutlined />
                          </Button>
                        </Link>
                        <Link href="/creators/new">
                          <Button icon={<PlusOutlined />}>
                            Добавить профиль
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
                        <UserOutlined
                          style={{ color: "#a855f7", fontSize: 24 }}
                        />
                      </div>
                      <p className="text-gray-500 text-sm font-medium mb-1">
                        Нет профилей
                      </p>
                      <p className="text-gray-400 text-xs text-center max-w-[260px] mb-4">
                        Создайте профиль — бизнес сам найдёт вас в каталоге
                      </p>
                      <Link href="/creators/new">
                        <Button type="primary" icon={<PlusOutlined />}>
                          Создать профиль
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ),
            },
            payments.length > 0 && {
              key: "payments",
              label: (
                <span className="flex items-center gap-1.5">
                  <CreditCardOutlined /> Операции
                </span>
              ),
              children: (
                <div>
                  <div className="space-y-2 mb-4">
                    {payments.slice(0, 5).map((p) => {
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
                                  {p.promoCode!.code} −
                                  {formatPrice(p.discountAmount!)}
                                </span>
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              {new Date(p.createdAt).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
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
                  <Link href="/cabinet/balance">
                    <Button type="text" size="small" className="text-sky-600">
                      Все операции <ArrowRightOutlined />
                    </Button>
                  </Link>
                </div>
              ),
            },
          ].filter(Boolean) as {
            key: string;
            label: React.ReactNode;
            children: React.ReactNode;
          }[]}
        />
      </div>

      {/* ── Секция 5: Мои отзывы ── */}
      {(myReviews.written.length > 0 || myReviews.received.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <StarFilled style={{ color: "#f59e0b", fontSize: 18 }} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Отзывы</h2>
              <p className="text-xs text-gray-400">
                История ваших оценок
              </p>
            </div>
          </div>

          <Tabs
            size="small"
            defaultActiveKey={
              myReviews.received.length >= myReviews.written.length
                ? "received"
                : "written"
            }
            items={[
              myReviews.received.length > 0 && {
                key: "received",
                label: `Обо мне (${myReviews.received.length})`,
                children: (
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
                ),
              },
              myReviews.written.length > 0 && {
                key: "written",
                label: `Я написал (${myReviews.written.length})`,
                children: (
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
                ),
              },
            ].filter(Boolean) as { key: string; label: string; children: React.ReactNode }[]}
          />
        </div>
      )}

      <TopupDrawer open={topupOpen} onClose={() => setTopupOpen(false)} />
    </>
  );
}
