"use client";

import Link from "next/link";
import { Badge, Tag, Dropdown, Button } from "antd";
import type { BadgeProps } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  InboxOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  RocketOutlined,
  MessageOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  AD_STATUS_COLORS,
  AD_STATUS_LABELS,
  BOOST_LABELS,
  BOOST_COLORS,
  BUDGET_TYPE_LABELS,
  BUDGET_TYPE_COLORS,
} from "@/lib/constants";
import BudgetTypeIcon from "@/components/ui/BudgetTypeIcon";
import { formatDate, daysUntilExpiry, formatBudgetPreview } from "@/lib/utils";
import type { Ad } from "@/lib/types/ad";
import {
  formatDaysLeft,
  getTopBoost,
} from "@/app/ads/manage/_lib/boost";
import { track } from "@/lib/analytics";

interface AdManagementCardProps {
  ad: Ad;
  onAction: (adId: string, action: string) => void;
  onRepublish?: (ad: Ad) => void;
}

export default function AdManagementCard({
  ad,
  onAction,
  onRepublish,
}: AdManagementCardProps) {
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
            onClick: () => onAction(ad.id, "pause"),
          },
        ]
      : []),
    ...(ad.status === "paused"
      ? [
          {
            key: "resume",
            icon: <PlayCircleOutlined />,
            label: "Возобновить",
            onClick: () => onAction(ad.id, "resume"),
          },
        ]
      : []),
    {
      key: "archive",
      icon: <InboxOutlined />,
      label: "Архивировать",
      onClick: () => onAction(ad.id, "archive"),
    },
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Удалить",
      danger: true,
      onClick: () => onAction(ad.id, "delete"),
    },
  ];

  const topBoost = getTopBoost(ad.activeBoostDetails);
  const hasActiveBoost = (ad.activeBoostDetails ?? []).length > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm">
      {/* Заголовок + меню */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/ads/${ad.id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 leading-snug flex-1"
        >
          {ad.title}
        </Link>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button
            type="text"
            icon={<EllipsisOutlined />}
            className="flex-shrink-0 -mt-0.5"
          />
        </Dropdown>
      </div>

      {/* Теги */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tag className="m-0">{ad.platform}</Tag>
        <Tag className="m-0">{ad.city}</Tag>
        {/* Тип оплаты блогеру */}
        <Tag color={BUDGET_TYPE_COLORS[ad.budgetType]} className="m-0">
          <BudgetTypeIcon type={ad.budgetType} size={11} className="shrink-0 inline mr-1" />{BUDGET_TYPE_LABELS[ad.budgetType]}
        </Tag>
        {/* Топ-буст с остатком дней */}
        {topBoost && (
          <Tag
            color={BOOST_COLORS[topBoost.boostType]}
            className="m-0"
            icon={<RocketOutlined />}
          >
            {BOOST_LABELS[topBoost.boostType]} ·{" "}
            {formatDaysLeft(topBoost.expiresAt)}
          </Tag>
        )}
      </div>

      {/* Бюджет для блогера */}
      <div className="text-sm font-semibold text-green-700 mb-3">
        {formatBudgetPreview(
          ad.budgetType,
          ad.budgetFrom,
          ad.budgetTo,
          ad.budgetDetails,
        )}
      </div>

      {/* Статус */}
      <div className="flex items-center gap-3 mb-3">
        <Badge
          status={AD_STATUS_COLORS[ad.status] as BadgeProps["status"]}
          text={
            <span className="text-sm font-medium">
              {AD_STATUS_LABELS[ad.status]}
            </span>
          }
        />
        {ad.status === "active" && ad.expiresAt && (
          <span className="text-xs text-gray-400">
            Осталось: {daysUntilExpiry(ad.expiresAt)} дн.
          </span>
        )}
      </div>

      {/* Кнопка «Продвинуть»/«Продлить буст» для активных */}
      {ad.status === "active" && (
        <Link
          href={`/ads/${ad.id}/boost`}
          className="block mb-3"
          onClick={() =>
            track("boost_cta_click", {
              entity: "ad",
              entity_id: ad.id,
              placement: "ads_manage_mobile",
              has_active_boost: hasActiveBoost,
            })
          }
        >
          <Button
            type="primary"
            icon={<RocketOutlined />}
            block
            style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
          >
            {hasActiveBoost ? "Продлить буст" : "Продвинуть объявление"}
          </Button>
        </Link>
      )}

      {/* Кнопка «Возобновить публикацию» для expired */}
      {ad.status === "expired" &&
        ad.paymentMode !== "escrow" &&
        onRepublish && (
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            block
            onClick={() => {
              track("republish_cta_click", {
                ad_id: ad.id,
                placement: "ads_manage_mobile",
                mode: "expired",
              });
              onRepublish(ad);
            }}
            className="!mb-3"
            style={{ background: "#3b82f6", borderColor: "#3b82f6" }}
          >
            Возобновить публикацию
          </Button>
        )}

      {/* Статистика + дата */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <EyeOutlined /> {ad.metadata.viewCount} просм.
          </span>
          <span className="flex items-center gap-1">
            <MessageOutlined /> {ad.metadata.contactClickCount} обращ.
          </span>
        </div>
        {ad.publishedAt && (
          <span className="text-xs text-gray-400">
            {formatDate(ad.publishedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
