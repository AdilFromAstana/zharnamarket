"use client";

import { useMemo } from "react";
import type { CreatorProfile } from "@/lib/types/creator";
import {
  FILTER_LABELS,
  type FilterKey,
  filterProfiles,
  getFilterCounts,
} from "../_lib/filter";
import ProfileCard from "./ProfileCard";

type Props = {
  profiles: CreatorProfile[];
  activeFilter: FilterKey;
  onFilterChange: (key: FilterKey) => void;
  onPublish: (id: string) => void;
};

export default function ProfileCardList({
  profiles,
  activeFilter,
  onFilterChange,
  onPublish,
}: Props) {
  const counts = useMemo(() => getFilterCounts(profiles), [profiles]);
  const visible = useMemo(
    () => filterProfiles(profiles, activeFilter),
    [profiles, activeFilter],
  );

  return (
    <div className="block md:hidden">
      <div className="overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-4 px-4">
        <div className="flex gap-2 w-max">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={[
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeFilter === key
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600",
              ].join(" ")}
            >
              {FILTER_LABELS[key]}
              <span
                className={[
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none",
                  activeFilter === key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500",
                ].join(" ")}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">
            Нет профилей
          </div>
        ) : (
          visible.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onPublish={onPublish}
            />
          ))
        )}
      </div>
    </div>
  );
}
