"use client";

import { useState, useEffect, useMemo } from "react";
import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import {
  getCities,
  getPlatforms,
  getBudgetTypes,
  BUDGET_TYPE_LABELS,
} from "@/lib/constants";
import BudgetTypeIcon from "@/components/ui/BudgetTypeIcon";
import type { AdFilters, AdFacets, BudgetType } from "@/lib/types/ad";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";

interface AdFiltersProps {
  filters: AdFilters;
  onChange: (filters: AdFilters) => void;
  onReset: () => void;
  facets?: AdFacets;
}

interface FilterItem {
  label: string;
  value: string;
}

const SORT_OPTIONS = [
  { label: "Новые", value: "new" },
  { label: "По бюджету", value: "budget" },
];

const CITIES_VISIBLE = 5;

const PAYMENT_MODE_ITEMS: FilterItem[] = [
  { label: PAYMENT_MODE_LABELS.direct, value: "direct" },
  { label: PAYMENT_MODE_LABELS.escrow, value: "escrow" },
];

function FilterSection({
  title,
  items,
  selected,
  onToggle,
  expandThreshold = 5,
  counts,
}: {
  title: string;
  items: FilterItem[];
  selected: string[];
  onToggle: (value: string) => void;
  expandThreshold?: number;
  counts?: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, expandThreshold);
  const hasMore = items.length > expandThreshold;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {visible.map((item) => {
          const active = selected.includes(item.value);
          const count = counts ? (counts[item.value] ?? 0) : undefined;
          const isDisabled = counts !== undefined && count === 0 && !active;

          return (
            <li key={item.value}>
              <button
                type="button"
                onClick={() => !isDisabled && onToggle(item.value)}
                disabled={isDisabled}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors text-left
                  ${
                    isDisabled
                      ? "opacity-40 cursor-not-allowed text-gray-400"
                      : active
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors
                      ${
                        isDisabled
                          ? "border-gray-200 bg-gray-50"
                          : active
                            ? "border-sky-500 bg-sky-500"
                            : "border-gray-300 bg-white"
                      }`}
                  >
                    {active && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {item.label}
                </span>
                {count !== undefined && (
                  <span
                    className={`text-xs tabular-nums ${
                      active
                        ? "text-sky-500"
                        : isDisabled
                          ? "text-gray-300"
                          : "text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-sky-600 hover:text-sky-800 font-medium transition-colors px-2"
        >
          {expanded
            ? "Свернуть"
            : `Выбрать ещё +${items.length - expandThreshold}`}
        </button>
      )}
    </div>
  );
}

function SortSection({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Сортировка
      </p>
      <div className="flex flex-col gap-0.5">
        {SORT_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left
                ${
                  active
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <span
                className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors
                  ${active ? "border-sky-500" : "border-gray-300 bg-white"}`}
              >
                {active && <span className="w-2 h-2 rounded-full bg-sky-500" />}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BudgetTypeSection({
  items,
  selected,
  onToggle,
  counts,
}: {
  items: FilterItem[];
  selected: string[];
  onToggle: (val: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Тип бюджета
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = selected.includes(item.value);
          const count = counts ? (counts[item.value] ?? 0) : undefined;
          const isDisabled = counts !== undefined && count === 0 && !active;
          const bt = item.value as BudgetType;

          return (
            <li key={item.value}>
              <button
                type="button"
                onClick={() => !isDisabled && onToggle(item.value)}
                disabled={isDisabled}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors text-left
                  ${
                    isDisabled
                      ? "opacity-40 cursor-not-allowed text-gray-400"
                      : active
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors
                      ${
                        isDisabled
                          ? "border-gray-200 bg-gray-50"
                          : active
                            ? "border-sky-500 bg-sky-500"
                            : "border-gray-300 bg-white"
                      }`}
                  >
                    {active && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <BudgetTypeIcon type={bt} size={12} />
                  <span>{BUDGET_TYPE_LABELS[bt]}</span>
                </span>
                {count !== undefined && (
                  <span
                    className={`text-xs tabular-nums ${
                      active
                        ? "text-sky-500"
                        : isDisabled
                          ? "text-gray-300"
                          : "text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Dynamic filter section for DB-driven categories.
 * Always loads ALL active items from API on mount.
 * Shows counts from facets (0 if absent), disables items with count=0.
 * Behaves exactly like FilterSection but pulls items from the API.
 */
function DynamicFacetSection({
  title,
  endpoint,
  facetCounts,
  selected,
  onToggle,
}: {
  title: string;
  endpoint: string;
  facetCounts?: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [items, setItems] = useState<FilterItem[]>([]);

  useEffect(() => {
    fetch(endpoint)
      .then((r) => r.json())
      .then((res) => {
        setItems(
          (res.data ?? []).map((item: { key: string; label: string }) => ({
            label: item.label,
            value: item.key,
          })),
        );
      })
      .catch(() => {});
  }, [endpoint]);

  if (items.length === 0) return null;

  return (
    <FilterSection
      title={title}
      items={items}
      selected={selected}
      onToggle={onToggle}
      counts={facetCounts}
    />
  );
}

export default function AdFiltersComponent({
  filters,
  onChange,
  onReset,
  facets,
}: AdFiltersProps) {
  const [cities, setCities] = useState<{ key: string; label: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ key: string; label: string }[]>([]);
  const [budgetTypes, setBudgetTypes] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [citiesData, platformsData, budgetTypesData] = await Promise.all([
          getCities(),
          getPlatforms(),
          getBudgetTypes(),
        ]);
        setCities(citiesData);
        setPlatforms(platformsData);
        setBudgetTypes(budgetTypesData);
      } catch (error) {
        console.error("Error loading reference data:", error);
      }
    };

    loadReferenceData();
  }, []);

  const PLATFORM_ITEMS = useMemo<FilterItem[]>(
    () => platforms.map((p) => ({ label: p.label, value: p.key })),
    [platforms],
  );
  const CITY_ITEMS = useMemo<FilterItem[]>(
    () =>
      cities
        .filter((c) => c.key !== "AllCities")
        .map((c) => ({ label: c.label, value: c.key })),
    [cities],
  );
  const BUDGET_TYPE_ITEMS = useMemo<FilterItem[]>(
    () => budgetTypes.map((t) => ({ label: t.label, value: t.key })),
    [budgetTypes],
  );

  const hasFilters = !!(
    filters.city?.length ||
    filters.platform?.length ||
    filters.category?.length ||
    filters.budgetType?.length ||
    filters.paymentMode?.length ||
    filters.videoFormat?.length ||
    filters.adFormat?.length ||
    filters.adSubject?.length ||
    filters.sortBy
  );

  /** Toggle a value in a multi-select array filter */
  const toggleArray = (
    key:
      | "city"
      | "platform"
      | "category"
      | "budgetType"
      | "paymentMode"
      | "videoFormat"
      | "adFormat"
      | "adSubject",
    val: string,
  ) => {
    const current = filters[key] ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...filters, [key]: next.length > 0 ? next : undefined });
  };

  /** Toggle single-value sort */
  const toggleSort = (val: string) => {
    onChange({
      ...filters,
      sortBy: filters.sortBy === val ? undefined : (val as AdFilters["sortBy"]),
    });
  };

  return (
    <div className="bg-white flex flex-col gap-5 md:rounded-2xl md:border md:border-gray-200 md:p-5">
      <div className="hidden md:flex justify-between items-center">
        <span className="flex items-center gap-1.5 font-semibold text-gray-800 text-sm">
          <FilterOutlined />
          Фильтры
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <CloseOutlined className="text-[10px]" />
            Сбросить
          </button>
        )}
      </div>

      <div className="hidden md:block h-px bg-gray-100" />

      <FilterSection
        title="Платформа"
        items={PLATFORM_ITEMS}
        selected={filters.platform ?? []}
        onToggle={(val) => toggleArray("platform", val)}
        counts={facets?.platform}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Город */}
      <FilterSection
        title="Город"
        items={CITY_ITEMS}
        selected={filters.city ?? []}
        onToggle={(val) => toggleArray("city", val)}
        expandThreshold={CITIES_VISIBLE}
        counts={facets?.city}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Тип бюджета */}
      <BudgetTypeSection
        items={BUDGET_TYPE_ITEMS}
        selected={filters.budgetType ?? []}
        onToggle={(val) => toggleArray("budgetType", val)}
        counts={facets?.budgetType}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Тип оплаты */}
      <FilterSection
        title="Тип оплаты"
        items={PAYMENT_MODE_ITEMS}
        selected={filters.paymentMode ?? []}
        onToggle={(val) => toggleArray("paymentMode", val)}
        counts={facets?.paymentMode}
      />

      {/* Новые категорийные фильтры — всегда показываются (загружают из API) */}
      <div className="hidden md:block h-px bg-gray-100" />
      <DynamicFacetSection
        title="Формат видео"
        endpoint="/api/video-formats"
        facetCounts={facets?.videoFormat}
        selected={filters.videoFormat ?? []}
        onToggle={(val) => toggleArray("videoFormat", val)}
      />

      <div className="hidden md:block h-px bg-gray-100" />
      <DynamicFacetSection
        title="Формат рекламы"
        endpoint="/api/ad-formats"
        facetCounts={facets?.adFormat}
        selected={filters.adFormat ?? []}
        onToggle={(val) => toggleArray("adFormat", val)}
      />

      <div className="hidden md:block h-px bg-gray-100" />
      <DynamicFacetSection
        title="Что рекламируется"
        endpoint="/api/ad-subjects"
        facetCounts={facets?.adSubject}
        selected={filters.adSubject ?? []}
        onToggle={(val) => toggleArray("adSubject", val)}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Сортировка */}
      <SortSection value={filters.sortBy} onChange={toggleSort} />
    </div>
  );
}
