"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Spin } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import PublicLayout from "@/components/layout/PublicLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import ProfileTable from "./_components/ProfileTable";
import ProfileCardList from "./_components/ProfileCardList";
import { useMyProfiles } from "./_hooks/useMyProfiles";
import { useProfileActions } from "./_hooks/useProfileActions";
import type { FilterKey } from "./_lib/filter";
import { track } from "@/lib/analytics";

export default function CreatorsManagePage() {
  const { isLoading: authLoading } = useRequireAuth();
  const { profiles, setProfiles } = useMyProfiles(authLoading);
  const { publish, unpublish, remove } = useProfileActions(setProfiles);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState("all");

  const stats = {
    published: profiles.filter((p) => p.isPublished).length,
    drafts: profiles.filter((p) => !p.isPublished).length,
    boosted: profiles.filter(
      (p) => (p.activeBoostDetails ?? []).length > 0,
    ).length,
    contacts: profiles.reduce((sum, p) => sum + (p.contactClickCount ?? 0), 0),
  };

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Мои профили
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Ваши анкеты в каталоге креаторов
          </p>
        </div>
        <Link href="/creators/new" className="w-full sm:w-auto sm:flex-shrink-0">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="w-full sm:w-auto"
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
          >
            Создать профиль
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Опубликованных",
            value: stats.published,
            color: "#22c55e",
          },
          {
            label: "Черновиков",
            value: stats.drafts,
            color: "#6b7280",
          },
          {
            label: "С бустом",
            value: stats.boosted,
            color: "#7c3aed",
          },
          {
            label: "Всего обращений",
            value: stats.contacts,
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

      <ProfileCardList
        profiles={profiles}
        activeFilter={activeFilter}
        onFilterChange={(key) => {
          track("manage_filter_change", { entity: "creator", filter: key });
          setActiveFilter(key);
        }}
        onPublish={publish}
      />

      <ProfileTable
        profiles={profiles}
        activeTab={activeTab}
        onTabChange={(key) => {
          track("manage_filter_change", { entity: "creator", filter: key });
          setActiveTab(key);
        }}
        onPublish={publish}
        onUnpublish={unpublish}
        onDelete={remove}
      />
    </PublicLayout>
  );
}
