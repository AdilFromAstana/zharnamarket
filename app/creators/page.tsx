import PublicLayout from "@/components/layout/PublicLayout";
import CreatorsListClient from "./CreatorsListClient";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import {
  safeInt,
  safeFloat,
  VALID_PLATFORMS,
  VALID_AVAILABILITY,
  checkLength,
  LIMITS,
} from "@/lib/validation";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/cookies";
import { distributeBoostedByTier, countBoostedBeforePage } from "@/lib/interleave-boosts";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import type { CreatorProfile, CreatorFacets, CreatorFilters } from "@/lib/types/creator";

// Получаем валидные категории и города из базы
async function getValidReferenceData() {
  const [categories, cities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { key: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      select: { key: true },
    }),
  ]);

  return {
    validCategoryKeys: categories.map(c => c.key),
    validCityKeys: cities.map(c => c.key),
  };
}

export const metadata = {
  title: "Каталог креаторов — Zharnamarket",
  description:
    "Найди TikTok, Instagram и YouTube блогеров в Казахстане. Прямой контакт без посредников.",
  openGraph: {
    title: "Каталог креаторов — Zharnamarket",
    description:
      "Найди TikTok, Instagram и YouTube блогеров в Казахстане. Прямой контакт без посредников.",
    type: "website",
  },
};

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

/** Split comma-separated query param into a trimmed array */
function parseCSV(val: string | undefined): string[] {
  return val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/** Clamp page to >= 1 */
function parsePage(val: string | undefined): number {
  return Math.max(1, safeInt(val ?? null, 1));
}

const EMPTY_FACETS: CreatorFacets = {
  platform: {},
  city: {},
  category: {},
  availability: {},
};

async function fetchCreatorsPage(opts: {
  page: number;
  cities: string[];
  platforms: string[];
  categories: string[];
  availabilities: string[];
  maxRate?: string;
  verified?: string;
  minRating?: string;
  sortBy?: string;
  search?: string;
}): Promise<{
  creators: CreatorProfile[];
  total: number;
  totalPages: number;
  facets: CreatorFacets;
}> {
  try {
    const {
      page, cities, platforms, categories, availabilities,
      maxRate, verified, minRating, sortBy = "new", search,
    } = opts;

    // Fetch valid category/city keys from DB (replaces static VALID_CATEGORIES)
    const [dbCategories, dbCities] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, select: { key: true } }),
      prisma.city.findMany({ where: { isActive: true }, select: { key: true } }),
    ]);
    const validCategoryKeys = new Set(dbCategories.map((c) => c.key));
    const validCityKeys = new Set(dbCities.map((c) => c.key));

    // Validate filter values (use DB keys)
    const validCities = cities.filter((c) => validCityKeys.has(c));
    const validPlatforms = platforms.filter((p) => VALID_PLATFORMS.has(p));
    const validCategories = categories.filter((c) => validCategoryKeys.has(c));
    const validAvailabilities = availabilities.filter((a) => VALID_AVAILABILITY.has(a));

    // Prisma filter primitives
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cityFilter: any = validCities.length ? { in: validCities } : undefined;
    const platformFilter = validPlatforms.length ? validPlatforms : undefined;
    const categoryFilter = validCategories.length ? validCategories : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availabilityFilter: any = validAvailabilities.length ? { in: validAvailabilities } : undefined;

    const parsedMaxRate = maxRate ? parseFloat(maxRate) : null;
    const parsedMinRating = minRating ? parseFloat(minRating) : null;

    // Base where — always applied (non-faceted conditions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = {
      isPublished: true,
      ...(parsedMaxRate !== null && !isNaN(parsedMaxRate) && { minimumRate: { lte: parsedMaxRate } }),
      ...(verified === "true" && { verified: true }),
      ...(parsedMinRating !== null && !isNaN(parsedMinRating) && { averageRating: { gte: parsedMinRating } }),
    };

    const trimmedSearch = search?.trim();
    if (trimmedSearch && trimmedSearch.length >= 2) {
      baseWhere.OR = [
        { title: { contains: trimmedSearch, mode: "insensitive" } },
        { fullName: { contains: trimmedSearch, mode: "insensitive" } },
        { bio: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    // Full where clause (all filters)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      ...baseWhere,
      ...(cityFilter && { city: { key: cityFilter } }),
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(categoryFilter && { categories: { some: { key: { in: categoryFilter } } } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };

    // Sort (без raisedAt — распределение бустнутых идёт через два запроса)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any;
    if (sortBy === "price") orderBy = { minimumRate: "asc" };
    else if (sortBy === "alphabet") orderBy = { fullName: "asc" };
    else if (sortBy === "rating") orderBy = [{ averageRating: "desc" }, { reviewCount: "desc" }];
    else if (sortBy === "popular") orderBy = { contactClickCount: "desc" };
    else orderBy = { createdAt: "desc" };

    // --- Faceted counts (each excludes its own dimension) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cityFacetWhere: any = {
      ...baseWhere,
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(categoryFilter && { categories: { some: { key: { in: categoryFilter } } } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platformFacetWhere: any = {
      ...baseWhere,
      ...(cityFilter && { city: { key: cityFilter } }),
      ...(categoryFilter && { categories: { some: { key: { in: categoryFilter } } } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryFacetWhere: any = {
      ...baseWhere,
      ...(cityFilter && { city: { key: cityFilter } }),
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availabilityFacetWhere: any = {
      ...baseWhere,
      ...(cityFilter && { city: { key: cityFilter } }),
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(categoryFilter && { categories: { some: { key: { in: categoryFilter } } } }),
    };

    const CATEGORY_VALUES = [...validCategoryKeys];

    // --- Два запроса: бустнутые + обычные, распределённые по страницам ---
    const now = new Date();
    const boostedWhere = { ...where, boosts: { some: { expiresAt: { gte: now } } } };
    const regularWhere = { ...where, NOT: { boosts: { some: { expiresAt: { gte: now } } } } };

    const ssrInclude = {
      platforms: true,
      portfolio: { orderBy: { createdAt: "desc" as const }, take: 4 },
      priceItems: { orderBy: { sortOrder: "asc" as const } },
      boosts: { where: { expiresAt: { gte: now } } },
      user: { select: { avatarColor: true } },
      city: { select: { id: true, key: true, label: true } },
      categories: { select: { id: true, key: true, label: true } },
    };

    // Считаем общее + бустнутое + фасеты параллельно
    const [
      [total, totalBoosted, cityCounts, availabilityCounts, platformCounts],
      categoryCountResults,
    ] = await Promise.all([
      Promise.all([
        prisma.creatorProfile.count({ where }),
        prisma.creatorProfile.count({ where: boostedWhere }),
        prisma.creatorProfile.groupBy({ by: ["cityId"], where: cityFacetWhere, _count: true }),
        prisma.creatorProfile.groupBy({ by: ["availability"], where: availabilityFacetWhere, _count: true }),
        prisma.creatorPlatform.groupBy({ by: ["name"], where: { profile: platformFacetWhere }, _count: true }),
      ]),
      Promise.all(
        CATEGORY_VALUES.map((cat) =>
          prisma.creatorProfile.count({
            where: { ...categoryFacetWhere, categories: { some: { key: cat } } },
          }),
        ),
      ),
    ]);

    // Рассчитываем слоты для бустнутых на каждую страницу (interleaved по тирам)
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Загружаем ВСЕ бустнутые (их немного) — нужны для распределения по тирам
    const allBoosted = totalBoosted > 0
      ? await prisma.creatorProfile.findMany({
          where: boostedWhere, orderBy, include: ssrInclude,
        })
      : [];

    // Per-visitor seed: разные посетители видят разный порядок бустов
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(COOKIE_NAMES.VISITOR_ID)?.value;

    // Пропорциональное распределение: каждая страница получает микс Premium+VIP+Rise
    const boostedItems = distributeBoostedByTier(allBoosted, page, totalPages, visitorId);
    const boostedOnThisPage = boostedItems.length;
    const boostedBefore = countBoostedBeforePage(allBoosted, page, totalPages, visitorId);
    const regularTake = PAGE_SIZE - boostedOnThisPage;
    const regularSkip = (page - 1) * PAGE_SIZE - boostedBefore;

    const regularItems = await prisma.creatorProfile.findMany({
      where: regularWhere, orderBy, skip: Math.max(0, regularSkip), take: regularTake, include: ssrInclude,
    });

    // Бустнутые наверху (уже отсортированы по приоритету), обычные после них
    const raws = [...boostedItems, ...regularItems];

    const cityIds = cityCounts.map((r) => r.cityId).filter((id): id is string => !!id);
    const cityKeyById = cityIds.length
      ? Object.fromEntries(
          (await prisma.city.findMany({ where: { id: { in: cityIds } }, select: { id: true, key: true } }))
            .map((c) => [c.id, c.key])
        )
      : {};

    const facets: CreatorFacets = {
      city: Object.fromEntries(
        cityCounts
          .filter((r) => r.cityId && cityKeyById[r.cityId])
          .map((r) => [cityKeyById[r.cityId!], r._count])
      ),
      availability: Object.fromEntries(availabilityCounts.map((r) => [r.availability, r._count])),
      platform: Object.fromEntries(platformCounts.map((r) => [r.name, r._count])),
      category: Object.fromEntries(
        CATEGORY_VALUES.map((cat, i) => [cat, categoryCountResults[i]]).filter(([, c]) => (c as number) > 0),
      ),
    };

    return {
      creators: raws.map(mapCreatorFromApi),
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
      facets,
    };
  } catch (err) {
    console.error("[fetchCreatorsPage]", err);
    return { creators: [], total: 0, totalPages: 0, facets: EMPTY_FACETS };
  }
}

export default async function CreatorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parsePage(params.page);

  // Parse comma-separated DB codes from URL
  const cities = parseCSV(params.city);
  const platforms = parseCSV(params.platform);
  const categories = parseCSV(params.category);
  const availabilities = parseCSV(params.availability);

  const { creators, total, totalPages, facets } = await fetchCreatorsPage({
    page,
    cities,
    platforms,
    categories,
    availabilities,
    maxRate: params.maxRate,
    verified: params.verified,
    minRating: params.minRating,
    sortBy: params.sortBy,
    search: params.search,
  });

  // Build initialFilters from URL params (DB codes as arrays)
  const initialFilters: CreatorFilters = {};
  if (cities.length) initialFilters.city = cities;
  if (platforms.length) initialFilters.platform = platforms;
  if (categories.length) initialFilters.category = categories;
  if (availabilities.length) initialFilters.availability = availabilities;
  if (params.maxRate) initialFilters.maxRate = parseFloat(params.maxRate);
  if (params.verified === "true") initialFilters.verified = true;
  if (params.minRating) initialFilters.minRating = parseFloat(params.minRating);
  if (params.sortBy) initialFilters.sortBy = params.sortBy as CreatorFilters["sortBy"];
  if (params.search) initialFilters.search = params.search;

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Каталог креаторов
        </h1>
        <p className="text-gray-500">
          Найди подходящего автора и свяжись напрямую
        </p>
      </div>
      <CreatorsListClient
        initialData={creators}
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
