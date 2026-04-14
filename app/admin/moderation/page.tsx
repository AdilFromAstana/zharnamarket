"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spin, Tabs } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { AdItem, CreatorItem } from "./_components/types";
import { AdsTab } from "./_components/AdsTab";
import { CreatorsTab } from "./_components/CreatorsTab";
import { ModerationActionSheet } from "./_components/ModerationActionSheet";

export default function AdminModerationPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAdmin();
  const [activeTab, setActiveTab] = useState("ads");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetAd, setSheetAd] = useState<AdItem | null>(null);
  const [sheetCreator, setSheetCreator] = useState<CreatorItem | null>(null);

  // Refresh key to force re-fetch on reload button
  const [refreshKey, setRefreshKey] = useState(0);

  const openAdSheet = useCallback((ad: AdItem) => {
    setSheetAd(ad);
    setSheetCreator(null);
    setSheetOpen(true);
  }, []);

  const openCreatorSheet = useCallback((c: CreatorItem) => {
    setSheetCreator(c);
    setSheetAd(null);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetAd(null);
      setSheetCreator(null);
    }, 300);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 transition-colors"
          >
            <ArrowLeftOutlined className="text-sm" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              Модерация
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Объявления и профили креаторов
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 transition-colors"
          >
            <ReloadOutlined />
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "ads",
              label: "Объявления",
              children: (
                <AdsTab
                  key={`ads-${refreshKey}`}
                  authLoading={authLoading}
                  onOpenSheet={openAdSheet}
                />
              ),
            },
            {
              key: "creators",
              label: "Креаторы",
              children: (
                <CreatorsTab
                  key={`creators-${refreshKey}`}
                  authLoading={authLoading}
                  onOpenSheet={openCreatorSheet}
                />
              ),
            },
          ]}
        />
      </div>

      <ModerationActionSheet
        open={sheetOpen}
        onClose={closeSheet}
        ad={sheetAd}
        creator={sheetCreator}
        onAdUpdated={(id, updated) => {
          setSheetAd((prev) =>
            prev?.id === id ? { ...prev, ...updated } : prev,
          );
        }}
        onCreatorUpdated={(id, updated) => {
          setSheetCreator((prev) =>
            prev?.id === id ? { ...prev, ...updated } : prev,
          );
        }}
      />
    </div>
  );
}
