"use client";

import { useState, useEffect, useMemo } from "react";
import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import { getCities, getPlatforms, getCategories } from "@/lib/constants";
import type { CreatorFilters, CreatorFacets } from "@/lib/types/creator";

interface CreatorFiltersProps {
  filters: CreatorFilters;
  onChange: (filters: CreatorFilters) => void;
  onReset: () => void;
  facets?: CreatorFacets;
}

interface FilterItem {
  label: string;
  value: string;
}

const SORT_OPTIONS = [
  { label: "Новые", value: "new" },
  { label: "По цене", value: "price" },
  { label: "По рейтингу", value: "rating" },
  { label: "Популярные", value: "popular" },
  { label: "По имени", value: "alphabet" },
];

const CITIES_VISIBLE = 5;
const CATEGORIES_VISIBLE = 5;

const AVAILABILITY_ITEMS: FilterItem[] = [
  { label: "Свободен", value: "available" },
  { label: "Частично свободен", value: "partially_available" },
];

/* ────────────────────────── Sub-components ────────────────────────── */

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
                  {/* Custom checkbox */}
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

function MaxRateSection({
  value,
  onChange,
}: {
  value?: number;
  onChange: (val: number | undefined) => void;
}) {
  const RATE_OPTIONS = [
    { label: "до 30 000 ₸", value: 30000 },
    { label: "до 60 000 ₸", value: 60000 },
    { label: "до 100 000 ₸", value: 100000 },
    { label: "до 200 000 ₸", value: 200000 },
  ];

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Макс. ставка
      </p>
      <div className="flex flex-col gap-0.5">
        {RATE_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(active ? undefined : opt.value)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left
                ${
                  active
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <span
                className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors
                  ${
                    active
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
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RatingSection({
  value,
  onChange,
}: {
  value?: number;
  onChange: (val: number | undefined) => void;
}) {
  const OPTIONS = [
    { label: "4+ звезды", value: 4 },
    { label: "3+ звезды", value: 3 },
  ];

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Мин. рейтинг
      </p>
      <div className="flex flex-col gap-0.5">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(active ? undefined : opt.value)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left
                ${
                  active
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <span
                className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors
                  ${
                    active
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
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VerifiedToggle({
  value,
  onChange,
}: {
  value?: boolean;
  onChange: (val: boolean | undefined) => void;
}) {
  const active = value === true;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Проверенные
      </p>
      <button
        type="button"
        onClick={() => onChange(active ? undefined : true)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left
          ${
            active
              ? "bg-sky-50 text-sky-700 font-semibold"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          }`}
      >
        <span
          className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors
            ${
              active
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
        Только верифицированные
      </button>
    </div>
  );
}

/* ────────────────────────── Main component ────────────────────────── */

export default function CreatorFiltersComponent({
  filters,
  onChange,
  onReset,
  facets,
}: CreatorFiltersProps) {
  const [cities, setCities] = useState<{ key: string; label: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ key: string; label: string }[]>([]);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [citiesData, platformsData, categoriesData] = await Promise.all([
          getCities(),
          getPlatforms(),
          getCategories(),
        ]);
        setCities(citiesData);
        setPlatforms(platformsData);
        setCategories(categoriesData);
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
  const CATEGORY_ITEMS = useMemo<FilterItem[]>(
    () => categories.map((c) => ({ label: c.label, value: c.key })),
    [categories],
  );

  const hasFilters = !!(
    filters.city?.length ||
    filters.platform?.length ||
    filters.category?.length ||
    filters.availability?.length ||
    filters.sortBy ||
    filters.maxRate ||
    filters.verified ||
    filters.minRating
  );

  /** Toggle a value in a multi-select array filter */
  const toggleArray = (
    key: "city" | "platform" | "category" | "availability",
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
      sortBy: filters.sortBy === val ? undefined : (val as CreatorFilters["sortBy"]),
    });
  };

  return (
    <div className="bg-white flex flex-col gap-5 md:rounded-2xl md:border md:border-gray-200 md:p-5">
      {/* Header */}
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

      {/* Divider */}
      <div className="hidden md:block h-px bg-gray-100" />

      {/* Платформа */}
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

      {/* Категория контента */}
      <FilterSection
        title="Категория контента"
        items={CATEGORY_ITEMS}
        selected={filters.category ?? []}
        onToggle={(val) => toggleArray("category", val)}
        expandThreshold={CATEGORIES_VISIBLE}
        counts={facets?.category}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Доступность */}
      <FilterSection
        title="Доступность"
        items={AVAILABILITY_ITEMS}
        selected={filters.availability ?? []}
        onToggle={(val) => toggleArray("availability", val)}
        counts={facets?.availability}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Макс. ставка */}
      <MaxRateSection
        value={filters.maxRate}
        onChange={(val) => onChange({ ...filters, maxRate: val })}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Рейтинг */}
      <RatingSection
        value={filters.minRating}
        onChange={(val) => onChange({ ...filters, minRating: val })}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Верифицированные */}
      <VerifiedToggle
        value={filters.verified}
        onChange={(val) => onChange({ ...filters, verified: val })}
      />

      <div className="hidden md:block h-px bg-gray-100" />

      {/* Сортировка */}
      <SortSection value={filters.sortBy} onChange={toggleSort} />
    </div>
  );
}
