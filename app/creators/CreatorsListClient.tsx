"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Drawer, Empty, Input, Spin } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import CreatorCard from "@/components/creators/CreatorCard";
import CreatorFiltersComponent from "@/components/creators/CreatorFilters";
import SEOPagination from "@/components/ads/SEOPagination";
import type { CreatorFilters, CreatorFacets, CreatorProfile } from "@/lib/types/creator";
import { mapCreatorFromApi } from "@/lib/mappers/creator";

const EMPTY_FACETS: CreatorFacets = {
  platform: {},
  city: {},
  category: {},
  availability: {},
};

/** Format total count with Russian pluralization: "42 креатора" */
function formatCreatorCount(n: number): string {
  const formatted = n.toLocaleString("ru-RU");
  const mod100 = n % 100;
  const mod10 = n % 10;
  let word: string;
  if (mod100 >= 11 && mod100 <= 19) {
    word = "креаторов";
  } else if (mod10 === 1) {
    word = "креатор";
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = "креатора";
  } else {
    word = "креаторов";
  }
  return `${formatted} ${word}`;
}

/** Build URL string from filters + page (DB codes, comma-separated). */
function buildURL(filters: CreatorFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.city?.length) params.set("city", filters.city.join(","));
  if (filters.platform?.length) params.set("platform", filters.platform.join(","));
  if (filters.category?.length) params.set("category", filters.category.join(","));
  if (filters.availability?.length) params.set("availability", filters.availability.join(","));
  if (filters.maxRate) params.set("maxRate", String(filters.maxRate));
  if (filters.verified) params.set("verified", "true");
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.search) params.set("search", filters.search);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/creators?${qs}` : "/creators";
}

/** Count total number of individual filter selections (for badge) */
function countSelections(f: CreatorFilters): number {
  return (
    (f.city?.length ?? 0) +
    (f.platform?.length ?? 0) +
    (f.category?.length ?? 0) +
    (f.availability?.length ?? 0) +
    (f.maxRate ? 1 : 0) +
    (f.verified ? 1 : 0) +
    (f.minRating ? 1 : 0) +
    (f.sortBy ? 1 : 0) +
    (f.search ? 1 : 0)
  );
}

interface Props {
  /** SSR data for initial render */
  initialData?: CreatorProfile[];
  /** Filters parsed from URL searchParams (SSR) — DB codes as arrays */
  initialFilters?: CreatorFilters;
  /** Current page from URL searchParams (SSR) */
  currentPage?: number;
  /** Total pages from SSR fetch */
  totalPages?: number;
  /** Total creators count from SSR (across all pages) */
  totalCount?: number;
  /** Initial faceted counts from SSR */
  initialFacets?: CreatorFacets;
  /** Items per page (matches server PAGE_SIZE) */
  pageSize?: number;
}

export default function CreatorsListClient({
  initialData = [],
  initialFilters,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  initialFacets = EMPTY_FACETS,
  pageSize = 20,
}: Props) {
  const router = useRouter();
  // Keep latest router in a ref so fetchCreators stays stable across router updates.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  const [filters, setFilters] = useState<CreatorFilters>(initialFilters ?? {});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creators, setCreators] = useState<CreatorProfile[]>(initialData);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [clientPage, setClientPage] = useState(currentPage);
  const [clientTotalPages, setClientTotalPages] = useState(totalPages);

  // Faceted counts + total count
  const [clientTotalCount, setClientTotalCount] = useState(totalCount);
  const [facets, setFacets] = useState<CreatorFacets>(initialFacets);

  /**
   * Flag: true while we are syncing state FROM server props (initial mount or
   * Link navigation with Router Cache component reuse).  Prevents the filters
   * useEffect from issuing a redundant client fetch when we programmatically
   * reset state to match new SSR data.
   */
  const isSyncingFromServer = useRef(true);

  /**
   * Sync all state from server props whenever `initialData` changes reference.
   * Declared BEFORE the filters effect so React runs it first in the same flush.
   */
  useEffect(() => {
    isSyncingFromServer.current = true;
    setCreators(initialData);
    setFacets(initialFacets);
    setClientTotalCount(totalCount);
    setClientTotalPages(totalPages);
    setClientPage(currentPage);
    setFilters(initialFilters ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // intentionally only on initialData

  /** Fetch creators from API. Uses routerRef for stable reference. */
  const fetchCreators = useCallback(
    async (f: CreatorFilters, page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (f.city?.length) params.set("city", f.city.join(","));
        if (f.platform?.length) params.set("platform", f.platform.join(","));
        if (f.category?.length) params.set("category", f.category.join(","));
        if (f.availability?.length) params.set("availability", f.availability.join(","));
        if (f.maxRate) params.set("maxRate", String(f.maxRate));
        if (f.verified) params.set("verified", "true");
        if (f.minRating) params.set("minRating", String(f.minRating));
        if (f.sortBy) params.set("sortBy", f.sortBy);
        if (f.search) params.set("search", f.search);
        params.set("page", String(page));
        params.set("limit", String(pageSize));

        const res = await fetch(`/api/creators?${params.toString()}`);
        if (!res.ok) throw new Error("Ошибка загрузки");
        const data = await res.json();

        setCreators((data.data ?? []).map(mapCreatorFromApi));
        setClientPage(page);
        setClientTotalPages(data.pagination?.totalPages ?? 1);
        setClientTotalCount(data.pagination?.total ?? 0);
        setFacets(data.facets ?? EMPTY_FACETS);

        // Sync URL
        routerRef.current.replace(buildURL(f, page), { scroll: false });
      } catch {
        setCreators([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  /**
   * When filters change -> reset to page 1 and fetch.
   * Skips when the change came from the server sync effect above.
   */
  useEffect(() => {
    if (isSyncingFromServer.current) {
      isSyncingFromServer.current = false;
      return;
    }
    setClientPage(1);
    fetchCreators(filters, 1);
  }, [filters, fetchCreators]);

  const handlePageChange = (page: number) => {
    fetchCreators(filters, page);
  };

  // Debounce search input
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = (value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value || undefined }));
    }, 400);
  };

  const handleReset = () => {
    setFilters({});
  };

  const activeCount = countSelections(filters);
  const countLabel = formatCreatorCount(clientTotalCount);

  return (
    <>
      {/* Search field */}
      <div className="mb-4">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Поиск по креаторам..."
          allowClear
          size="large"
          defaultValue={initialFilters?.search ?? ""}
          onChange={(e) => handleSearch(e.target.value)}
          className="rounded-xl"
        />
      </div>

      {/* Mobile sticky header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 py-2.5 flex items-center justify-between md:hidden mb-4">
        <span className="text-sm text-gray-500">
          Найдено <strong className="text-gray-700">{countLabel}</strong>
        </span>
        <Badge count={activeCount} size="small" color="#0ea5e9">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FilterOutlined />
            Фильтры
          </button>
        </Badge>
      </div>

      {/* Right Drawer for mobile filters */}
      <Drawer
        open={drawerOpen}
        placement="right"
        onClose={() => setDrawerOpen(false)}
        title="Фильтры"
        styles={{
          wrapper: { width: "100%" },
          body: { padding: "16px", paddingBottom: 0 },
        }}
        footer={
          <Button
            type="primary"
            block
            size="large"
            onClick={() => setDrawerOpen(false)}
            style={{ background: "#0ea5e9", borderColor: "#0ea5e9" }}
          >
            Применить
          </Button>
        }
      >
        <CreatorFiltersComponent
          filters={filters}
          onChange={setFilters}
          onReset={handleReset}
          facets={facets}
        />
      </Drawer>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-2/6 shrink-0">
          <CreatorFiltersComponent
            filters={filters}
            onChange={setFilters}
            onReset={handleReset}
            facets={facets}
          />
        </aside>

        {/* Creator list */}
        <div className="w-full md:w-4/6 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spin size="large" />
            </div>
          ) : creators.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16">
              <Empty
                description="По вашему запросу креаторов не найдено"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-3 hidden md:block">
                Найдено <strong className="text-gray-700">{countLabel}</strong>
              </p>
              <div className="flex flex-col gap-2">
                {creators.map((creator) => (
                  <CreatorCard key={creator.id} creator={creator} />
                ))}
              </div>

              <SEOPagination
                currentPage={clientPage}
                totalPages={clientTotalPages}
                baseUrl="/creators"
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
