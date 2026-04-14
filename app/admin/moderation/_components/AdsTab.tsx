"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Spin, Empty, Select, Input } from "antd";
import { SearchOutlined, MoreOutlined } from "@ant-design/icons";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AdItem } from "./types";
import { getAdStatus, smartDate } from "./status-helpers";
import { StatusPill } from "./StatusPill";
import { SmartPagination } from "./SmartPagination";

interface AdsTabProps {
  authLoading: boolean;
  onOpenSheet: (ad: AdItem) => void;
}

export function AdsTab({ authLoading, onOpenSheet }: AdsTabProps) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (status !== "all") params.set("status", status);
      params.set("page", String(pagination.page));
      params.set("limit", "20");
      const data = await api.get<{
        data: AdItem[];
        pagination: { total: number; totalPages: number };
      }>(`/api/admin/ads?${params.toString()}`);
      setAds(data.data);
      setPagination((p) => ({
        ...p,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, status, pagination.page]);

  useEffect(() => {
    if (!authLoading) fetchAds();
  }, [authLoading, fetchAds]);

  return (
    <>
      {/* Search + filters */}
      <div className="mb-4">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Поиск по объявлениям..."
          allowClear
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => {
              setSearchQuery(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }, 400);
          }}
          className="!rounded-xl"
          size="large"
        />
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <Select
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="shrink-0"
          style={{ minWidth: 150 }}
          size="middle"
          options={[
            { label: "Все статусы", value: "all" },
            { label: "Активные", value: "active" },
            { label: "Черновики", value: "draft" },
            { label: "На паузе", value: "paused" },
            { label: "Истёкшие", value: "expired" },
            { label: "Удалённые", value: "deleted" },
          ]}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16">
          <Empty
            description="Объявлений не найдено"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ads.map((ad) => {
            const st = getAdStatus(ad.deletedAt ? "deleted" : ad.status);
            return (
              <div
                key={ad.id}
                className={cn(
                  "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                  ad.deletedAt
                    ? "border-red-200 bg-red-50/20 opacity-60"
                    : "border-gray-100",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/ads/${ad.id}`}
                        target="_blank"
                        className="font-semibold text-[15px] text-gray-900 hover:text-sky-600 truncate leading-tight transition-colors"
                      >
                        {ad.title}
                      </Link>
                      <StatusPill {...st} />
                    </div>
                    <p className="text-[13px] text-gray-500 truncate mt-0.5 leading-tight">
                      {ad.owner.name} · {ad.owner.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center text-[12px] text-gray-400 bg-gray-50 rounded-full px-2 py-0.5 font-medium">
                        {ad.platform}
                      </span>
                      <span className="text-[12px] text-gray-400">
                        {ad.city}
                      </span>
                      <span className="text-[11px] text-gray-300">·</span>
                      <span className="text-[12px] text-gray-400">
                        {smartDate(ad.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenSheet(ad)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
                  >
                    <MoreOutlined className="text-lg" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SmartPagination
        current={pagination.page}
        total={pagination.totalPages}
        onChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />
    </>
  );
}
