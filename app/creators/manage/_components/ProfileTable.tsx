"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EyeOutlined,
  FileTextOutlined,
  MessageOutlined,
  RocketOutlined,
  StarFilled,
} from "@ant-design/icons";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  BOOST_COLORS,
  BOOST_LABELS,
  PLATFORM_COLORS,
} from "@/lib/constants";
import { formatFollowers } from "@/lib/utils";
import type { CreatorPlatform, CreatorProfile } from "@/lib/types/creator";
import { formatDaysLeft, getTopBoost } from "../_lib/boost";
import { filterProfiles, getFilterCounts } from "../_lib/filter";
import { formatRate } from "../_lib/rate";
import ProfileRowActions from "./ProfileRowActions";

type Props = {
  profiles: CreatorProfile[];
  activeTab: string;
  onTabChange: (key: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function ProfileTable({
  profiles,
  activeTab,
  onTabChange,
  onPublish,
  onUnpublish,
  onDelete,
}: Props) {
  const counts = useMemo(() => getFilterCounts(profiles), [profiles]);

  const columns: ColumnsType<CreatorProfile> = useMemo(
    () => [
      {
        title: "Профиль",
        key: "title",
        width: 360,
        render: (_, profile) => (
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/creators/${profile.id}`}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {profile.fullName}
              </Link>
              {profile.verified && <VerifiedBadge size={14} />}
            </div>
            <div className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
              <FileTextOutlined /> {profile.title}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {profile.platforms.slice(0, 3).map((p: CreatorPlatform) => (
                <div
                  key={p.name}
                  className="flex items-center gap-1 text-xs text-gray-600"
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: PLATFORM_COLORS[p.name] }}
                  >
                    {p.name.charAt(0)}
                  </span>
                  {p.name}
                  {p.followers && (
                    <span className="text-gray-400">
                      {formatFollowers(p.followers)}
                    </span>
                  )}
                </div>
              ))}
              {profile.city && (
                <span className="text-xs text-gray-400">· {profile.city}</span>
              )}
            </div>
          </div>
        ),
      },
      {
        title: "Статус",
        key: "status",
        width: 180,
        render: (_, profile) => {
          const availabilityColor = AVAILABILITY_COLORS[profile.availability];
          const availabilityLabel = AVAILABILITY_LABELS[profile.availability];
          const topBoost = getTopBoost(profile.activeBoostDetails);
          return (
            <div>
              {profile.isPublished ? (
                <Badge status="success" text="Опубликован" />
              ) : (
                <Badge status="default" text="Черновик" />
              )}
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
              {profile.availability !== "available" && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: availabilityColor }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: availabilityColor }}
                  >
                    {availabilityLabel}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Статистика",
        key: "stats",
        width: 160,
        render: (_, profile) => (
          <div className="text-sm">
            <div className="text-gray-700 flex items-center gap-1">
              <EyeOutlined /> {profile.viewCount ?? 0} просм.
            </div>
            <div className="text-gray-500 flex items-center gap-1">
              <MessageOutlined /> {profile.contactClickCount ?? 0} обращ.
            </div>
            <div className="text-gray-500 flex items-center gap-1">
              <StarFilled className="text-amber-400" />
              {profile.reviewCount > 0
                ? `${profile.averageRating.toFixed(1)} (${profile.reviewCount})`
                : "нет отзывов"}
            </div>
          </div>
        ),
      },
      {
        title: "Ставка",
        key: "rate",
        width: 160,
        align: "right",
        render: (_, profile) => {
          const rate = formatRate(profile);
          return (
            <div className="text-sm text-gray-700">
              {rate.primary}
              {rate.secondary && (
                <span className="text-xs text-gray-400 ml-1">
                  · {rate.secondary}
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: "",
        key: "actions",
        width: 180,
        render: (_, profile) => (
          <ProfileRowActions
            profile={profile}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onPublish, onUnpublish, onDelete],
  );

  const allTabs = [
    {
      key: "all",
      label: `Все (${counts.all})`,
      count: counts.all,
      children: (
        <Table
          dataSource={profiles}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
    {
      key: "published",
      label: `Опубликованные (${counts.published})`,
      count: counts.published,
      children: (
        <Table
          dataSource={filterProfiles(profiles, "published")}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
    {
      key: "draft",
      label: `Черновики (${counts.draft})`,
      count: counts.draft,
      children: (
        <Table
          dataSource={filterProfiles(profiles, "draft")}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
  ];

  const tabItems = allTabs
    .filter((t) => t.key === "all" || t.key === activeTab || t.count > 0)
    .map((t) => ({ key: t.key, label: t.label, children: t.children }));

  return (
    <div className="hidden md:block bg-white rounded-xl border border-gray-200">
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={tabItems}
        tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }}
      />
    </div>
  );
}
