"use client";

import { useState } from "react";
import { Modal } from "antd";
import { LinkOutlined, EyeOutlined } from "@ant-design/icons";
import { formatFollowers } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";
import { ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import type { CreatorProfile } from "@/lib/types/creator";

type PortfolioItem = CreatorProfile["portfolio"][number];

interface CreatorPortfolioSectionProps {
  portfolio: PortfolioItem[];
}

const PORTFOLIO_LIMIT = 5;

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <a
      href={item.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 w-44 sm:w-48 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow snap-start"
    >
      <div className="aspect-[9/16] relative overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt={
            item.description ||
            `${item.platform} · ${ENUM_TO_CATEGORY[item.category] ?? item.category}`
          }
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-md">
              <LinkOutlined className="text-gray-700 text-lg" />
            </div>
          </div>
        </div>
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ background: PLATFORM_COLORS[item.platform] }}
        >
          {item.platform}
        </div>
        {item.views && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
            <EyeOutlined /> {formatFollowers(item.views)}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 mb-1">
          {ENUM_TO_CATEGORY[item.category] ?? item.category}
        </span>
        <p className="text-xs text-gray-500 line-clamp-2 leading-tight">
          {item.description ??
            `${item.platform} · ${ENUM_TO_CATEGORY[item.category] ?? item.category}`}
        </p>
      </div>
    </a>
  );
}

function PortfolioGridCard({ item }: { item: PortfolioItem }) {
  return (
    <a
      href={item.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="aspect-[9/16] relative overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt={
            item.description ||
            `${item.platform} · ${ENUM_TO_CATEGORY[item.category] ?? item.category}`
          }
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ background: PLATFORM_COLORS[item.platform] }}
        >
          {item.platform}
        </div>
        {item.views && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
            <EyeOutlined /> {formatFollowers(item.views)}
          </div>
        )}
      </div>
      <div className="p-2">
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 mb-1">
          {ENUM_TO_CATEGORY[item.category] ?? item.category}
        </span>
        <p className="text-xs text-gray-500 line-clamp-1 leading-tight">
          {item.description ??
            `${item.platform} · ${ENUM_TO_CATEGORY[item.category] ?? item.category}`}
        </p>
      </div>
    </a>
  );
}

export default function CreatorPortfolioSection({
  portfolio,
}: CreatorPortfolioSectionProps) {
  const [tab, setTab] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const uniqueCategories = [...new Set(portfolio.map((i) => i.category))];
  const filtered =
    tab === "all" ? portfolio : portfolio.filter((i) => i.category === tab);
  const carousel = filtered.slice(0, PORTFOLIO_LIMIT);
  const hasMore = filtered.length > PORTFOLIO_LIMIT;

  if (portfolio.length === 0) return null;

  return (
    <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <LinkOutlined className="text-sky-500" /> Портфолио ({portfolio.length})
      </h2>

      {/* Carousel */}
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-200">
        {carousel.map((item) => (
          <PortfolioCard key={item.id} item={item} />
        ))}
      </div>

      {/* Show more */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Подробнее ({filtered.length})
          </button>
        </div>
      )}

      {/* Full portfolio modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={900}
        title={
          <span className="flex items-center gap-2">
            <LinkOutlined className="text-sky-500" /> Портфолио (
            {portfolio.length})
          </span>
        }
      >
        {/* Category tabs */}
        {uniqueCategories.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Все
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setTab(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {ENUM_TO_CATEGORY[cat] ?? cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.map((item) => (
            <PortfolioGridCard key={item.id} item={item} />
          ))}
        </div>
      </Modal>
    </div>
  );
}
