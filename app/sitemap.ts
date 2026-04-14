import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://viraladds.kz";

/**
 * Добавляет hreflang-alternates для ru и kk к одному URL.
 * Поскольку отдельных /kk/* маршрутов нет, оба языка указывают
 * на один и тот же URL — Google корректно интерпретирует это как
 * двуязычный контент, релевантный для ru и kk аудитории.
 */
function withLangAlternates(url: string) {
  return {
    alternates: {
      languages: {
        ru: url,
        kk: url,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Статичные публичные страницы
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      ...withLangAlternates(BASE_URL),
    },
    {
      url: `${BASE_URL}/ads`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
      ...withLangAlternates(`${BASE_URL}/ads`),
    },
    {
      url: `${BASE_URL}/creators`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
      ...withLangAlternates(`${BASE_URL}/creators`),
    },
  ];

  // 2. Paginated /ads listing pages + individual ad pages
  let paginatedAdsRoutes: MetadataRoute.Sitemap = [];
  let adRoutes: MetadataRoute.Sitemap = [];
  try {
    const ADS_PAGE_SIZE = 20;
    const [ads, totalAds] = await Promise.all([
      prisma.ad.findMany({
        where: { status: "active", deletedAt: null },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.ad.count({
        where: { status: "active", deletedAt: null },
      }),
    ]);

    // Paginated listing pages (page 2+, page 1 is already in staticRoutes)
    const totalPages = Math.ceil(totalAds / ADS_PAGE_SIZE);
    if (totalPages > 1) {
      paginatedAdsRoutes = Array.from(
        { length: totalPages - 1 },
        (_, i) => {
          const page = i + 2;
          const url = `${BASE_URL}/ads?page=${page}`;
          return {
            url,
            lastModified: new Date(),
            changeFrequency: "hourly" as const,
            priority: 0.7,
            ...withLangAlternates(url),
          };
        },
      );
    }

    // Individual ad pages
    adRoutes = ads.map((ad) => {
      const url = `${BASE_URL}/ads/${ad.id}`;
      return {
        url,
        lastModified: ad.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        ...withLangAlternates(url),
      };
    });
  } catch {
    // Sitemap не должен падать — возвращаем пустой массив для этого блока
  }

  // 3. Динамические профили опубликованных креаторов
  let creatorRoutes: MetadataRoute.Sitemap = [];
  try {
    const creators = await prisma.creatorProfile.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    creatorRoutes = creators.map((creator) => {
      const url = `${BASE_URL}/creators/${creator.id}`;
      return {
        url,
        lastModified: creator.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        ...withLangAlternates(url),
      };
    });
  } catch {
    // Не падаем — статичные страницы уже добавлены выше
  }

  return [...staticRoutes, ...paginatedAdsRoutes, ...adRoutes, ...creatorRoutes];
}
