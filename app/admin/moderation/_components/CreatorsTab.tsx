"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Spin, Empty, Select, Input } from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  StarOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api-client";
import { CreatorItem } from "./types";
import { smartDate } from "./status-helpers";
import { StatusPill } from "./StatusPill";
import { SmartPagination } from "./SmartPagination";

interface CreatorsTabProps {
  authLoading: boolean;
  onOpenSheet: (creator: CreatorItem) => void;
}

export function CreatorsTab({ authLoading, onOpenSheet }: CreatorsTabProps) {
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [published, setPublished] = useState("all");
  const [verified, setVerified] = useState("all");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (published !== "all") params.set("published", published);
      if (verified !== "all") params.set("verified", verified);
      params.set("page", String(pagination.page));
      params.set("limit", "20");
      const data = await api.get<{
        data: CreatorItem[];
        pagination: { total: number; totalPages: number };
      }>(`/api/admin/creators?${params.toString()}`);
      setCreators(data.data);
      setPagination((p) => ({
        ...p,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, published, verified, pagination.page]);

  useEffect(() => {
    if (!authLoading) fetchCreators();
  }, [authLoading, fetchCreators]);

  return (
    <>
      {/* Search + filters */}
      <div className="mb-4">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Поиск по креаторам..."
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
          value={published}
          onChange={(v) => {
            setPublished(v);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="shrink-0"
          style={{ minWidth: 140 }}
          size="middle"
          options={[
            { label: "Все", value: "all" },
            { label: "Опубликованные", value: "true" },
            { label: "Черновики", value: "false" },
          ]}
        />
        <Select
          value={verified}
          onChange={(v) => {
            setVerified(v);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="shrink-0"
          style={{ minWidth: 150 }}
          size="middle"
          options={[
            { label: "Верификация", value: "all" },
            { label: "Проверенные", value: "true" },
            { label: "Не проверенные", value: "false" },
          ]}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : creators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16">
          <Empty
            description="Профилей не найдено"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {creators.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/creators/${c.id}`}
                      target="_blank"
                      className="font-semibold text-[15px] text-gray-900 hover:text-sky-600 truncate leading-tight transition-colors"
                    >
                      {c.title}
                    </Link>
                    {c.isPublished ? (
                      <StatusPill
                        dot="bg-green-500"
                        text="text-green-700"
                        bg="bg-green-50"
                        label="Опубл."
                      />
                    ) : (
                      <StatusPill
                        dot="bg-gray-400"
                        text="text-gray-600"
                        bg="bg-gray-50"
                        label="Черновик"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {c.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                        <CheckCircleOutlined className="text-[10px]" />{" "}
                        Проверен
                      </span>
                    )}
                    {!c.verified && c.verificationStatus === "pending" && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                        Ожидает верификации
                      </span>
                    )}
                    {c.featured && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                        <StarOutlined className="text-[10px]" /> Featured
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] text-gray-500 truncate mt-0.5 leading-tight">
                    {c.user.name} · {c.user.email}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[12px] text-gray-400">{c.city}</span>
                    <span className="text-[11px] text-gray-300">·</span>
                    <span className="text-[12px] text-gray-400">
                      {smartDate(c.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenSheet(c)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
                >
                  <MoreOutlined className="text-lg" />
                </button>
              </div>
            </div>
          ))}
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
