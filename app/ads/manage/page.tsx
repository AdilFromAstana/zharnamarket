"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Tag, Tabs, Table, Dropdown, Badge, Spin } from "antd";
import type { BadgeProps } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  InboxOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  CreditCardOutlined,
  CloseOutlined,
  MessageOutlined,
  RocketOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PublicLayout from "@/components/layout/PublicLayout";
import AdManagementCard from "@/components/ads/AdManagementCard";
import RepublishModal from "@/components/republish/RepublishModal";
import {
  AD_STATUS_COLORS,
  AD_STATUS_LABELS,
  PUBLICATION_PRICE,
  BOOST_COLORS,
  BOOST_LABELS,
  PLATFORM_COLORS,
} from "@/lib/constants";
import { daysUntilExpiry, formatBudgetShort, formatPrice } from "@/lib/utils";
import type { Ad } from "@/lib/types/ad";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { formatDaysLeft, getTopBoost } from "./_lib/boost";
import {
  FILTER_LABELS,
  filterAds,
  getFilterCounts,
  parseFilter,
  type FilterKey,
} from "./_lib/filter";
import { useMyAds } from "./_hooks/useMyAds";
import { useAdActions } from "./_hooks/useAdActions";
import { track } from "@/lib/analytics";

function AdsManagePageInner() {
  const { isLoading: authLoading } = useRequireAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    ads,
    setAds,
    loading,
    refetch,
    pendingPayment,
    dismissPendingPayment,
  } = useMyAds(authLoading);
  const { pause, resume, archive, remove } = useAdActions(setAds);
  const [republishAd, setRepublishAd] = useState<Ad | null>(null);

  const filter = parseFilter(searchParams.get("filter"));
  const setFilter = useCallback(
    (next: FilterKey) => {
      track("manage_filter_change", { entity: "ad", filter: next });
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("filter");
      else params.set("filter", next);
      const query = params.toString();
      router.replace(`/ads/manage${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  const filterCounts = getFilterCounts(ads);
  const filteredCards = filterAds(ads, filter);

  const columns: ColumnsType<Ad> = [
    {
      title: "Объявление",
      key: "title",
      width: 360,
      render: (_, ad) => (
        <div>
          <Link
            href={`/ads/${ad.id}`}
            className="font-medium text-gray-900 hover:text-blue-600"
          >
            {ad.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span
                className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: PLATFORM_COLORS[ad.platform] }}
              >
                {ad.platform.charAt(0)}
              </span>
              {ad.platform}
            </div>
            {ad.city && (
              <span className="text-xs text-gray-400">· {ad.city}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Статус",
      key: "status",
      width: 180,
      render: (_, ad) => {
        const topBoost = getTopBoost(ad.activeBoostDetails);
        return (
          <div>
            <Badge
              status={AD_STATUS_COLORS[ad.status] as BadgeProps["status"]}
              text={AD_STATUS_LABELS[ad.status]}
            />
            {topBoost && (
              <div className="mt-1">
                <Tag
                  color={BOOST_COLORS[topBoost.boostType]}
                  icon={<RocketOutlined />}
                  className="m-0"
                >
                  {BOOST_LABELS[topBoost.boostType]} ·{" "}
                  {formatDaysLeft(topBoost.expiresAt)}
                </Tag>
              </div>
            )}
            {ad.status === "active" && ad.expiresAt && (
              <div className="text-xs text-gray-400 mt-0.5">
                Осталось: {daysUntilExpiry(ad.expiresAt)} дн.
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Статистика",
      key: "stats",
      width: 140,
      render: (_, ad) => (
        <div className="text-sm">
          <div className="text-gray-700 flex items-center gap-1">
            <EyeOutlined /> {ad.metadata.viewCount} просм.
          </div>
          <div className="text-gray-500 flex items-center gap-1">
            <MessageOutlined /> {ad.metadata.contactClickCount} обращ.
          </div>
        </div>
      ),
    },
    {
      title: "Бюджет",
      key: "budget",
      width: 160,
      align: "right",
      render: (_, ad) => (
        <span className="text-sm text-gray-700">
          {formatBudgetShort(
            ad.budgetType,
            ad.budgetFrom,
            ad.budgetTo,
            ad.budgetDetails,
          )}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_, ad) => {
        const hasActiveBoost = (ad.activeBoostDetails ?? []).length > 0;
        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: <Link href={`/ads/${ad.id}`}>Просмотр</Link>,
          },
          {
            key: "edit",
            icon: <EditOutlined />,
            label: <Link href={`/ads/${ad.id}/edit`}>Редактировать</Link>,
          },
          { type: "divider" as const },
          ...(ad.status === "active"
            ? [
                {
                  key: "pause",
                  icon: <PauseOutlined />,
                  label: "Поставить на паузу",
                  onClick: () => pause(ad.id),
                },
              ]
            : []),
          ...(ad.status === "paused"
            ? [
                {
                  key: "resume",
                  icon: <PlayCircleOutlined />,
                  label: "Возобновить",
                  onClick: () => resume(ad.id),
                },
              ]
            : []),
          {
            key: "archive",
            icon: <InboxOutlined />,
            label: "Архивировать",
            onClick: () => archive(ad.id),
          },
          { type: "divider" as const },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            label: "Удалить",
            danger: true,
            onClick: () => remove(ad.id),
          },
        ];

        const needsPayment =
          ad.status === "draft" || ad.status === "pending_payment";

        return (
          <div className="flex items-center gap-2 justify-end">
            {needsPayment && (
              <Link href={`/ads/new?resume=${ad.id}`}>
                <Button
                  type="primary"
                  size="small"
                  icon={<CreditCardOutlined />}
                  style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
                >
                  Оплатить
                </Button>
              </Link>
            )}
            {ad.status === "expired" && ad.paymentMode !== "escrow" && (
              <Button
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  track("republish_cta_click", {
                    ad_id: ad.id,
                    placement: "ads_manage_desktop_inline",
                    mode: "expired",
                  });
                  setRepublishAd(ad);
                }}
                style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
              >
                Возобновить
              </Button>
            )}
            {ad.status === "paused" && (
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => resume(ad.id)}
                style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
              >
                Возобновить
              </Button>
            )}
            {ad.status === "active" && (
              <Link
                href={`/ads/${ad.id}/boost`}
                onClick={() =>
                  track("boost_cta_click", {
                    entity: "ad",
                    entity_id: ad.id,
                    placement: "ads_manage_desktop_inline",
                    has_active_boost: hasActiveBoost,
                  })
                }
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<RocketOutlined />}
                  style={{
                    background: hasActiveBoost ? "#fff" : "#7c3aed",
                    borderColor: "#7c3aed",
                    color: hasActiveBoost ? "#7c3aed" : "#fff",
                  }}
                >
                  {hasActiveBoost ? "Продлить" : "Продвинуть"}
                </Button>
              </Link>
            )}
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button type="text" icon={<EllipsisOutlined />} />
            </Dropdown>
          </div>
        );
      },
    },
  ];

  const handleAction = (id: string, action: string) => {
    if (action === "pause") pause(id);
    else if (action === "resume") resume(id);
    else if (action === "archive") archive(id);
    else if (action === "delete") remove(id);
  };

  const tabItems = (Object.keys(FILTER_LABELS) as FilterKey[])
    .filter((key) => key === "all" || key === filter || filterCounts[key] > 0)
    .map((key) => ({
      key,
      label: `${FILTER_LABELS[key]} (${filterCounts[key]})`,
      children: (
        <Table
          dataSource={filterAds(ads, key)}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
        />
      ),
    }));

  return (
    <PublicLayout>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Мои задания
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Управляйте своими размещениями
          </p>
        </div>
        <Link href="/ads/new" className="w-full sm:w-auto sm:flex-shrink-0">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="w-full sm:w-auto"
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
          >
            Создать задание
          </Button>
        </Link>
      </div>

      {pendingPayment && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <CreditCardOutlined className="text-amber-600 text-lg" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Незавершённая оплата
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Объявление заполнено, но не оплачено —{" "}
                {formatPrice(PUBLICATION_PRICE)} за публикацию на 7 дней
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/ads/new?resume=true">
              <Button
                type="primary"
                size="small"
                icon={<CreditCardOutlined />}
                style={{ background: "#F59E0B", borderColor: "#F59E0B" }}
              >
                Оплатить
              </Button>
            </Link>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={dismissPendingPayment}
              className="text-amber-600 hover:text-amber-800"
              title="Отменить и удалить черновик"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Активных",
            value: filterCounts.active,
            color: "#22c55e",
          },
          {
            label: "Истекших",
            value: filterCounts.expired,
            color: "#ef4444",
          },
          {
            label: "С бустом",
            value: ads.filter((a) => (a.activeBoostDetails ?? []).length > 0)
              .length,
            color: "#7c3aed",
          },
          {
            label: "Всего обращений",
            value: ads.reduce(
              (sum, a) => sum + (a.metadata?.contactClickCount ?? 0),
              0,
            ),
            color: "#0EA5E9",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="block md:hidden">
        <div className="overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600",
                ].join(" ")}
              >
                {FILTER_LABELS[key]}
                <span
                  className={[
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none",
                    filter === key
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {filterCounts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {filteredCards.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">
              Нет объявлений
            </div>
          ) : (
            filteredCards.map((ad) => (
              <AdManagementCard
                key={ad.id}
                ad={ad}
                onAction={handleAction}
                onRepublish={(a) => setRepublishAd(a)}
              />
            ))
          )}
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200">
        <Tabs
          activeKey={filter}
          onChange={(key) => setFilter(key as FilterKey)}
          items={tabItems}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }}
        />
      </div>

      {republishAd && (
        <RepublishModal
          open={!!republishAd}
          onClose={() => setRepublishAd(null)}
          adId={republishAd.id}
          adTitle={republishAd.title}
          mode={republishAd.status === "expired" ? "expired" : "active"}
          currentExpiresAt={republishAd.expiresAt}
          onSuccess={refetch}
        />
      )}
    </PublicLayout>
  );
}

export default function AdsManagePage() {
  return (
    <Suspense fallback={null}>
      <AdsManagePageInner />
    </Suspense>
  );
}
