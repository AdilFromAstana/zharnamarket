import PublicLayout from "@/components/layout/PublicLayout";
import AdsListClient from "./AdsListClient";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { mapPrismaAdToAd } from "@/lib/mappers/ad";
import { distributeBoostedByTier, countBoostedBeforePage } from "@/lib/interleave-boosts";
import { toDbCity, toDbCategory } from "@/lib/enum-maps";
import { COOKIE_NAMES } from "@/lib/cookies";
import { cookies } from "next/headers";
import type { Ad, AdFacets, AdFilters } from "@/lib/types/ad";
import type { Metadata } from "next";

const PAGE_SIZE = 20;

const VALID_PLATFORMS = new Set(["TikTok", "Instagram", "YouTube"]);
const VALID_BUDGET_TYPES = new Set([
  "fixed",
  "per_views",
  "revenue",
  "negotiable",
]);

interface SearchParams {
  page?: string;
  city?: string;
  platform?: string;
  category?: string;
  budgetType?: string;
  paymentMode?: string;
  videoFormat?: string;
  adFormat?: string;
  adSubject?: string;
  sortBy?: string;
  search?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

function parsePage(raw?: string): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Parse comma-separated string into non-empty trimmed array */
function parseCSV(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function multiFilter(vals: string[]): any {
  if (vals.length === 0) return undefined;
  return vals.length === 1 ? vals[0] : { in: vals };
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const suffix = page > 1 ? ` — Страница ${page}` : "";

  // Build canonical URL with filter codes (excluding search to avoid index duplication)
  const canonicalParams = new URLSearchParams();
  if (params.city) canonicalParams.set("city", params.city);
  if (params.platform) canonicalParams.set("platform", params.platform);
  if (params.category) canonicalParams.set("category", params.category);
  if (params.budgetType) canonicalParams.set("budgetType", params.budgetType);
  if (params.sortBy) canonicalParams.set("sortBy", params.sortBy);
  if (page > 1) canonicalParams.set("page", String(page));
  const qs = canonicalParams.toString();
  const canonical = qs
    ? `https://viraladds.kz/ads?${qs}`
    : "https://viraladds.kz/ads";

  return {
    title: `Объявления${suffix} — ViralAds PARTNER`,
    description: `Найди рекламные задания для TikTok, Instagram и YouTube в Казахстане. Объявления от бизнеса напрямую без посредников.${suffix}`,
    openGraph: {
      title: `Объявления${suffix} — ViralAds PARTNER`,
      description: `Найди рекламные задания для TikTok, Instagram и YouTube в Казахстане. Объявления от бизнеса напрямую без посредников.${suffix}`,
      type: "website",
    },
    alternates: { canonical },
  };
}

interface FetchParams {
  page: number;
  cities: string[];
  platforms: string[];
  categories: string[];
  budgetTypes: string[];
  paymentModes: string[];
  videoFormats: string[];
  adFormats: string[];
  adSubjects: string[];
  sortBy?: string;
  search?: string;
}

async function fetchAdsPage(p: FetchParams): Promise<{
  ads: Ad[];
  total: number;
  totalPages: number;
  facets: AdFacets;
}> {
  try {
    // Validate & convert to DB enum keys
    const validCities = p.cities
      .map((c) => toDbCity(c))
      .filter((c) => c && c !== "AllCities");
    const validPlatforms = p.platforms.filter((pl) => VALID_PLATFORMS.has(pl));
    const validCategories = p.categories
      .map((c) => toDbCategory(c))
      .filter(Boolean);
    const validBudgetTypes = p.budgetTypes.filter((b) =>
      VALID_BUDGET_TYPES.has(b),
    );
    const validPaymentModes = p.paymentModes.filter(
      (m) => m === "direct" || m === "escrow",
    );

    const cityFilter = multiFilter(validCities);
    const platformFilter = multiFilter(validPlatforms);
    const categoryFilter = multiFilter(validCategories);
    const budgetTypeFilter = multiFilter(validBudgetTypes);
    const paymentModeFilter = multiFilter(validPaymentModes);

    // New DB-driven category dimension filters (IDs, already valid)
    const videoFormatFilter =
      p.videoFormats.length > 0 ? multiFilter(p.videoFormats) : undefined;
    const adFormatFilter =
      p.adFormats.length > 0 ? multiFilter(p.adFormats) : undefined;
    const adSubjectFilter =
      p.adSubjects.length > 0 ? multiFilter(p.adSubjects) : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = {
      status: { in: ["active" as const, "paused" as const] },
      deletedAt: null,
    };

    const search = p.search?.trim();
    if (search && search.length >= 2) {
      baseWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const where = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };

    // Shared new-dimension filters (applied to old facet wheres)
    const newDimFilters = {
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };

    // Facet wheres — each excludes its own dimension
    const platformFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const cityFacetWhere = {
      ...baseWhere,
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const categoryFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const budgetTypeFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const paymentModeFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...newDimFilters,
    };

    // New dimension facet wheres (each excludes its own dimension)
    const baseWithOldFilters = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
    };
    const videoFormatFacetWhere = {
      ...baseWithOldFilters,
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };
    const adFormatFacetWhere = {
      ...baseWithOldFilters,
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };
    const adSubjectFacetWhere = {
      ...baseWithOldFilters,
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
    };

    // Сортировка (без raisedAt — распределение бустнутых идёт через два запроса)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any =
      p.sortBy === "budget"
        ? { budgetFrom: "desc" }
        : { publishedAt: "desc" };

    // --- Два запроса: бустнутые + обычные, распределённые по страницам ---
    const now = new Date();
    const boostedWhere = { ...where, boosts: { some: { expiresAt: { gt: now } } } };
    const regularWhere = { ...where, NOT: { boosts: { some: { expiresAt: { gt: now } } } } };

    const adInclude = {
      boosts: {
        where: { expiresAt: { gt: now } },
        select: { boostType: true, expiresAt: true },
      },
      owner: {
        select: {
          id: true,
          name: true,
          advertiserProfile: {
            select: { companyName: true, displayName: true, verified: true },
          },
        },
      },
      videoFormat: { select: { id: true, key: true, label: true, icon: true } },
      adFormat: { select: { id: true, key: true, label: true, icon: true } },
      adSubject: { select: { id: true, key: true, label: true, icon: true } },
    };

    // Считаем total + totalBoosted + фасеты параллельно
    const [
      total, totalBoosted,
      platformCounts, cityCounts, categoryCounts, budgetTypeCounts, paymentModeCounts,
      videoFormatCounts, adFormatCounts, adSubjectCounts,
    ] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.count({ where: boostedWhere }),
      prisma.ad.groupBy({ by: ["platform"], where: platformFacetWhere, _count: true }),
      prisma.ad.groupBy({ by: ["city"], where: cityFacetWhere, _count: true }),
      prisma.ad.groupBy({ by: ["category"], where: categoryFacetWhere, _count: true }),
      prisma.ad.groupBy({ by: ["budgetType"], where: budgetTypeFacetWhere, _count: true }),
      prisma.ad.groupBy({ by: ["paymentMode"], where: paymentModeFacetWhere, _count: true }),
      prisma.ad.groupBy({ by: ["videoFormatId"], where: { ...videoFormatFacetWhere, videoFormatId: { not: null } }, _count: true }),
      prisma.ad.groupBy({ by: ["adFormatId"], where: { ...adFormatFacetWhere, adFormatId: { not: null } }, _count: true }),
      prisma.ad.groupBy({ by: ["adSubjectId"], where: { ...adSubjectFacetWhere, adSubjectId: { not: null } }, _count: true }),
    ]);

    // Рассчитываем слоты для бустнутых на каждую страницу (interleaved по тирам)
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Загружаем ВСЕ бустнутые (их немного) — нужны для распределения по тирам
    const allBoosted = totalBoosted > 0
      ? await prisma.ad.findMany({ where: boostedWhere, orderBy, include: adInclude })
      : [];

    // Per-visitor seed: разные посетители видят разный порядок бустов
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(COOKIE_NAMES.VISITOR_ID)?.value;

    // Пропорциональное распределение: каждая страница получает микс Premium+VIP+Rise
    const boostedItems = distributeBoostedByTier(allBoosted, p.page, totalPages, visitorId);
    const boostedOnThisPage = boostedItems.length;
    const boostedBefore = countBoostedBeforePage(allBoosted, p.page, totalPages, visitorId);
    const regularTake = PAGE_SIZE - boostedOnThisPage;
    const regularSkip = (p.page - 1) * PAGE_SIZE - boostedBefore;

    const regularItems = await prisma.ad.findMany({
      where: regularWhere, orderBy, skip: Math.max(0, regularSkip), take: regularTake, include: adInclude,
    });

    const raws = [...boostedItems, ...regularItems];

    const facets: AdFacets = {
      platform: Object.fromEntries(platformCounts.map((r) => [r.platform, r._count])),
      city: Object.fromEntries(cityCounts.map((r) => [r.city, r._count])),
      category: Object.fromEntries(categoryCounts.map((r) => [r.category, r._count])),
      budgetType: Object.fromEntries(budgetTypeCounts.map((r) => [r.budgetType, r._count])),
      paymentMode: Object.fromEntries(paymentModeCounts.map((r) => [r.paymentMode, r._count])),
      videoFormat: Object.fromEntries(videoFormatCounts.map((r) => [r.videoFormatId!, r._count])),
      adFormat: Object.fromEntries(adFormatCounts.map((r) => [r.adFormatId!, r._count])),
      adSubject: Object.fromEntries(adSubjectCounts.map((r) => [r.adSubjectId!, r._count])),
    };

    return {
      ads: raws.map(mapPrismaAdToAd),
      total,
      totalPages,
      facets,
    };
  } catch {
    return {
      ads: [],
      total: 0,
      totalPages: 0,
      facets: {
        platform: {},
        city: {},
        category: {},
        budgetType: {},
        paymentMode: {},
        videoFormat: {},
        adFormat: {},
        adSubject: {},
      },
    };
  }
}

export default async function AdsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parsePage(params.page);

  // Parse comma-separated DB codes from URL
  const cities = parseCSV(params.city);
  const platforms = parseCSV(params.platform);
  const categories = parseCSV(params.category);
  const budgetTypes = parseCSV(params.budgetType);
  const paymentModes = parseCSV(params.paymentMode);
  const videoFormats = parseCSV(params.videoFormat);
  const adFormats = parseCSV(params.adFormat);
  const adSubjects = parseCSV(params.adSubject);

  const { ads, total, totalPages, facets } = await fetchAdsPage({
    page,
    cities,
    platforms,
    categories,
    budgetTypes,
    paymentModes,
    videoFormats,
    adFormats,
    adSubjects,
    sortBy: params.sortBy,
    search: params.search,
  });

  // Build initialFilters from URL params (DB codes as arrays)
  const initialFilters: AdFilters = {};
  if (cities.length) initialFilters.city = cities;
  if (platforms.length) initialFilters.platform = platforms;
  if (categories.length) initialFilters.category = categories;
  if (budgetTypes.length) initialFilters.budgetType = budgetTypes;
  if (paymentModes.length) initialFilters.paymentMode = paymentModes;
  if (videoFormats.length) initialFilters.videoFormat = videoFormats;
  if (adFormats.length) initialFilters.adFormat = adFormats;
  if (adSubjects.length) initialFilters.adSubject = adSubjects;
  if (params.sortBy)
    initialFilters.sortBy = params.sortBy as AdFilters["sortBy"];
  if (params.search) initialFilters.search = params.search;

  return (
    <PublicLayout>
      <div className="md:mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Объявления</h1>
        <p className="text-gray-500">
          Найди подходящий проект и свяжись с бизнесом напрямую
        </p>
      </div>
      <AdsListClient
        initialData={ads}
        initialFilters={initialFilters}
        currentPage={page}
        totalPages={totalPages}
        totalCount={total}
        initialFacets={facets}
        pageSize={PAGE_SIZE}
      />
    </PublicLayout>
  );
}
