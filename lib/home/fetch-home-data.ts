import "server-only";

import { prisma } from "@/lib/prisma";
import { mapPrismaAdToAd } from "@/lib/mappers/ad";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import type { Ad } from "@/lib/types/ad";
import type { CreatorProfile } from "@/lib/types/creator";

import { VIDEO_FORMATS_FALLBACK } from "./home-content";
import type { VideoFormatCard } from "./types";

export async function fetchLatestAds(take = 6): Promise<Ad[]> {
  try {
    const ads = await prisma.ad.findMany({
      where: { status: "active", deletedAt: null },
      orderBy: [{ publishedAt: "desc" }],
      take,
      include: {
        boosts: {
          where: { expiresAt: { gt: new Date() } },
          select: { boostType: true },
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
        city: true,
        category: true,
        videoFormat: true,
        adFormat: true,
        adSubject: true,
      },
    });
    return ads.map(mapPrismaAdToAd);
  } catch (err) {
    console.error("[fetchLatestAds]", err);
    return [];
  }
}

export async function fetchLatestCreators(take = 6): Promise<CreatorProfile[]> {
  try {
    const now = new Date();
    const raws = await prisma.creatorProfile.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        platforms: true,
        portfolio: { orderBy: { createdAt: "desc" }, take: 4 },
        priceItems: { orderBy: { sortOrder: "asc" } },
        boosts: { where: { expiresAt: { gte: now } } },
        user: { select: { avatarColor: true } },
        city: { select: { id: true, key: true, label: true } },
        categories: { select: { id: true, key: true, label: true } },
      },
    });
    return raws.map(mapCreatorFromApi);
  } catch (err) {
    console.error("[fetchLatestCreators]", err);
    return [];
  }
}

export async function fetchHomeCounts(): Promise<{
  ads: number;
  creators: number;
}> {
  try {
    const [ads, creators] = await Promise.all([
      prisma.ad.count({ where: { status: "active", deletedAt: null } }),
      prisma.creatorProfile.count({ where: { isPublished: true } }),
    ]);
    return { ads, creators };
  } catch (err) {
    console.error("[fetchHomeCounts]", err);
    return { ads: 0, creators: 0 };
  }
}

export async function fetchVideoFormats(): Promise<VideoFormatCard[]> {
  try {
    const rows = await prisma.videoFormat.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { key: true, label: true, description: true },
    });
    if (rows.length === 0) return VIDEO_FORMATS_FALLBACK;
    return rows;
  } catch (err) {
    console.error("[fetchVideoFormats]", err);
    return VIDEO_FORMATS_FALLBACK;
  }
}
