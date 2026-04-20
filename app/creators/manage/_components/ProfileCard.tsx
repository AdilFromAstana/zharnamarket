"use client";

import Link from "next/link";
import { Button, Tag } from "antd";
import {
  EditOutlined,
  FileTextOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  BOOST_COLORS,
  BOOST_LABELS,
  PLATFORM_COLORS,
} from "@/lib/constants";
import { cn, formatFollowers, getAvatarGradient } from "@/lib/utils";
import type {
  CreatorPlatform,
  CreatorProfile,
  PortfolioItem,
} from "@/lib/types/creator";
import { formatDaysLeft, getTopBoost } from "../_lib/boost";
import { formatRate } from "../_lib/rate";
import { track } from "@/lib/analytics";

type Props = {
  profile: CreatorProfile;
  onPublish: (id: string) => void;
};

export default function ProfileCard({ profile, onPublish }: Props) {
  const availabilityColor = AVAILABILITY_COLORS[profile.availability];
  const availabilityLabel = AVAILABILITY_LABELS[profile.availability];
  const topBoost = getTopBoost(profile.activeBoostDetails);
  const hasActiveBoost = (profile.activeBoostDetails ?? []).length > 0;
  const rate = formatRate(profile);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 overflow-hidden border-l-4",
        profile.isPublished ? "border-l-sky-400" : "border-l-gray-300",
      )}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-12 h-12 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl shadow-sm",
                profile.avatarColor ?? getAvatarGradient(profile.fullName),
              )}
            >
              {profile.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-base flex items-center gap-1 leading-tight">
                <span className="truncate">{profile.fullName}</span>
                {profile.verified && <VerifiedBadge size={14} />}
              </div>
              <div className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 max-w-full truncate">
                <FileTextOutlined className="shrink-0" /> {profile.title}
              </div>
            </div>
          </div>
          <div className="shrink-0 mt-0.5 flex flex-col items-end gap-1">
            {profile.isPublished ? (
              <Tag color="green" className="text-xs m-0">
                Опубликован
              </Tag>
            ) : (
              <Tag color="default" className="text-xs m-0">
                Черновик
              </Tag>
            )}
            {topBoost && (
              <Tag
                color={BOOST_COLORS[topBoost.boostType]}
                icon={<RocketOutlined />}
                className="text-xs m-0"
              >
                {BOOST_LABELS[topBoost.boostType]} ·{" "}
                {formatDaysLeft(topBoost.expiresAt)}
              </Tag>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: availabilityColor }}
          />
          <span
            style={{ color: availabilityColor }}
            className="text-xs font-medium"
          >
            {availabilityLabel}
          </span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-gray-500 text-xs">{profile.city}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.platforms.slice(0, 3).map((p: CreatorPlatform) => (
            <div
              key={p.name}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-700"
            >
              <span
                className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: PLATFORM_COLORS[p.name] }}
              >
                {p.name.charAt(0)}
              </span>
              <span>{p.name}</span>
              {p.followers && (
                <span className="text-gray-400 font-medium">
                  {formatFollowers(p.followers)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {profile.portfolio.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {profile.portfolio.slice(0, 4).map((item: PortfolioItem) => (
              <div
                key={item.id}
                className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-100"
              >
                {item.thumbnail && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
            {profile.portfolio.length > 4 && (
              <div className="w-20 h-20 shrink-0 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400 font-medium">
                +{profile.portfolio.length - 4}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-base font-bold text-gray-800">
            {rate.primary}
          </div>
          {rate.secondary && (
            <span className="text-xs text-gray-400">{rate.secondary}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!profile.isPublished && (
            <Button
              type="primary"
              size="middle"
              block
              onClick={() => onPublish(profile.id)}
              style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
              className="mb-1.5"
            >
              Опубликовать
            </Button>
          )}
          {profile.isPublished && (
            <Link
              href={`/creators/${profile.id}/boost`}
              className="w-full"
              onClick={() =>
                track("boost_cta_click", {
                  entity: "creator",
                  entity_id: profile.id,
                  placement: "creators_manage_mobile",
                  has_active_boost: hasActiveBoost,
                })
              }
            >
              <Button
                type="primary"
                size="middle"
                icon={<RocketOutlined />}
                block
                className="mb-1.5"
                style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
              >
                {hasActiveBoost ? "Продлить буст" : "Продвинуть профиль"}
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2 w-full">
            <Link href={`/creators/edit?id=${profile.id}`} className="flex-1">
              <Button
                type="default"
                size="middle"
                icon={<EditOutlined />}
                block
              >
                Изменить
              </Button>
            </Link>
            <Link href={`/creators/${profile.id}`} className="flex-1">
              <Button
                type="default"
                size="middle"
                block
                className="text-sky-600 border-sky-200"
              >
                Смотреть →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
