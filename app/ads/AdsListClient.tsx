"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Drawer, Empty, Input, Spin } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import AdCard from "@/components/ads/AdCard";
import AdFiltersComponent from "@/components/ads/AdFilters";
import SEOPagination from "@/components/ads/SEOPagination";
import type { AdFilters, AdFacets } from "@/lib/types/ad";
import type { Ad } from "@/lib/types/ad";

const EMPTY_FACETS: AdFacets = {
  platform: {},
  city: {},
  category: {},
  budgetType: {},
  paymentMode: {},
  videoFormat: {},
  adFormat: {},
  adSubject: {},
};

/** Format total count with Russian pluralization: "7 942 объявления" */
function formatAdCount(n: number): string {
  const formatted = n.toLocaleString("ru-RU");
  const mod100 = n % 100;
  const mod10 = n % 10;
  let word: string;
  if (mod100 >= 11 && mod100 <= 19) {
    word = "объявлений";
  } else if (mod10 === 1) {
    word = "объявление";
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = "объявления";
  } else {
    word = "объявлений";
  }
  return `${formatted} ${word}`;
}

/** Build URL string from filters + page (DB codes, comma-separated). */
function buildURL(filters: AdFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.city?.length) params.set("city", filters.city.join(","));
  if (filters.platform?.length)
    params.set("platform", filters.platform.join(","));
  if (filters.category?.length)
    params.set("category", filters.category.join(","));
  if (filters.budgetType?.length)
    params.set("budgetType", filters.budgetType.join(","));
  if (filters.paymentMode?.length)
    params.set("paymentMode", filters.paymentMode.join(","));
  if (filters.videoFormat?.length)
    params.set("videoFormat", filters.videoFormat.join(","));
  if (filters.adFormat?.length)
    params.set("adFormat", filters.adFormat.join(","));
  if (filters.adSubject?.length)
    params.set("adSubject", filters.adSubject.join(","));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.search) params.set("search", filters.search);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/ads?${qs}` : "/ads";
}

/** Count total number of individual filter selections (for badge) */
function countSelections(f: AdFilters): number {
  return (
    (f.city?.length ?? 0) +
    (f.platform?.length ?? 0) +
    (f.category?.length ?? 0) +
    (f.budgetType?.length ?? 0) +
    (f.paymentMode?.length ?? 0) +
    (f.videoFormat?.length ?? 0) +
    (f.adFormat?.length ?? 0) +
    (f.adSubject?.length ?? 0) +
    (f.sortBy ? 1 : 0) +
    (f.search ? 1 : 0)
  );
}

interface Props {
  /** SSR data for initial render */
  initialData?: Ad[];
  /** Filters parsed from URL searchParams (SSR) — DB codes as arrays */
  initialFilters?: AdFilters;
  /** Current page from URL searchParams (SSR) */
  currentPage?: number;
  /** Total pages from SSR fetch */
  totalPages?: number;
  /** Total ads count from SSR (across all pages) */
  totalCount?: number;
  /** Initial faceted counts from SSR */
  initialFacets?: AdFacets;
  /** Items per page (matches server PAGE_SIZE) */
  pageSize?: number;
}

export default function AdsListClient({
  initialData = [],
  initialFilters,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  initialFacets = EMPTY_FACETS,
  pageSize = 20,
}: Props) {
  const router = useRouter();
  // Keep latest router in a ref so fetchAds stays stable across router updates.
  // Without this, router changes during soft-navigation recreate fetchAds, which
  // re-triggers the useEffect even though filters haven't changed, making a
  // spurious client request on every Link click.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  const [filters, setFilters] = useState<AdFilters>(initialFilters ?? {});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ads, setAds] = useState<Ad[]>(initialData);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [clientPage, setClientPage] = useState(currentPage);
  const [clientTotalPages, setClientTotalPages] = useState(totalPages);

  // Faceted counts + total count
  const [clientTotalCount, setClientTotalCount] = useState(totalCount);
  const [facets, setFacets] = useState<AdFacets>(initialFacets);

  /**
   * Flag: true while we are syncing state FROM server props (initial mount or
   * Link navigation with Router Cache component reuse).  Prevents the filters
   * useEffect from issuing a redundant client fetch when we programmatically
   * reset state to match new SSR data.
   *
   * Why useRef instead of useState: we need the update to be visible to effects
   * that fire in the SAME render cycle, without triggering an extra re-render.
   */
  const isSyncingFromServer = useRef(true); // starts true: first render is always from server

  /**
   * Sync all state from server props whenever `initialData` changes reference.
   * This covers two cases:
   *   1. Initial mount — state is already correct from useState(), but we still
   *      mark the flag so the filters effect skips its first run.
   *   2. Link navigation with Router Cache — Next.js reuses the component
   *      instance but passes new props; we must sync state so the stale client
   *      state from the previous visit doesn't persist.
   *
   * Declared BEFORE the filters effect so React runs it first in the same flush.
   */
  useEffect(() => {
    isSyncingFromServer.current = true;
    setAds(initialData);
    setFacets(initialFacets);
    setClientTotalCount(totalCount);
    setClientTotalPages(totalPages);
    setClientPage(currentPage);
    setFilters(initialFilters ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // intentionally only on initialData — it changes on every navigation

  /** Fetch ads from API. Accepts filters and page as arguments.
   *  Uses routerRef so the function reference is fully stable — no router
   *  in the dependency array means no spurious re-runs on navigation. */
  const fetchAds = useCallback(
    async (f: AdFilters, page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (f.city?.length) params.set("city", f.city.join(","));
        if (f.platform?.length) params.set("platform", f.platform.join(","));
        if (f.category?.length) params.set("category", f.category.join(","));
        if (f.budgetType?.length)
          params.set("budgetType", f.budgetType.join(","));
        if (f.paymentMode?.length)
          params.set("paymentMode", f.paymentMode.join(","));
        if (f.videoFormat?.length)
          params.set("videoFormat", f.videoFormat.join(","));
        if (f.adFormat?.length)
          params.set("adFormat", f.adFormat.join(","));
        if (f.adSubject?.length)
          params.set("adSubject", f.adSubject.join(","));
        if (f.sortBy) params.set("sortBy", f.sortBy);
        if (f.search) params.set("search", f.search);
        params.set("page", String(page));
        params.set("limit", String(pageSize));

        const res = await fetch(`/api/tasks?${params.toString()}`);
        if (!res.ok) throw new Error("Ошибка загрузки");
        const data = await res.json();

        const adapted = (data.data ?? []).map(
          (ad: Record<string, unknown>) => ({
            ...ad,
            boosts: ((ad.boosts as Array<{ boostType: string }>) ?? []).map(
              (b) => b.boostType,
            ),
            metadata: {
              createdAt: ad.createdAt,
              updatedAt: ad.updatedAt,
              viewCount: ad.viewCount ?? 0,
              contactClickCount: ad.contactClickCount ?? 0,
            },
            contacts: {
              telegram: ad.contactTelegram,
              whatsapp: ad.contactWhatsapp,
              phone: ad.contactPhone,
              email: ad.contactEmail,
            },
          }),
        );

        setAds(adapted);
        setClientPage(page);
        setClientTotalPages(data.pagination?.totalPages ?? 1);
        setClientTotalCount(data.pagination?.total ?? 0);
        setFacets(data.facets ?? EMPTY_FACETS);

        // Sync URL — use ref to avoid including router in fetchAds deps
        routerRef.current.replace(buildURL(f, page), { scroll: false });
      } catch {
        setAds([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize], // router intentionally omitted — accessed via routerRef
  );

  /**
   * When filters change → reset to page 1 and fetch.
   * Skips when the change came from the server sync effect above (isSyncingFromServer).
   * Runs AFTER the initialData effect because of declaration order.
   */
  useEffect(() => {
    if (isSyncingFromServer.current) {
      isSyncingFromServer.current = false; // consumed — next filter change is from the user
      return;
    }
    setClientPage(1);
    fetchAds(filters, 1);
  }, [filters, fetchAds]);

  const handlePageChange = (page: number) => {
    fetchAds(filters, page);
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
  const countLabel = formatAdCount(clientTotalCount);

  return (
    <>
      {/* Search field */}
      <div className="mb-4">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Поиск по объявлениям..."
          allowClear
          size="large"
          defaultValue={initialFilters?.search ?? ""}
          onChange={(e) => handleSearch(e.target.value)}
          className="rounded-xl"
        />
      </div>

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
        <AdFiltersComponent
          filters={filters}
          onChange={setFilters}
          onReset={handleReset}
          facets={facets}
        />
      </Drawer>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-2/6 shrink-0">
          <AdFiltersComponent
            filters={filters}
            onChange={setFilters}
            onReset={handleReset}
            facets={facets}
          />
        </aside>

        {/* Ads list */}
        <div className="w-full md:w-4/6 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spin size="large" />
            </div>
          ) : ads.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16">
              <Empty
                description="По вашему запросу объявлений не найдено"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-3 hidden md:block">
                Найдено <strong className="text-gray-700">{countLabel}</strong>
              </p>
              <div className="flex flex-col gap-4">
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>

              <SEOPagination
                currentPage={clientPage}
                totalPages={clientTotalPages}
                baseUrl="/ads"
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
