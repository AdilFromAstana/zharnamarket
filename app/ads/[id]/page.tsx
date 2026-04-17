import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import PublicLayout from "@/components/layout/PublicLayout";
import AdDetailClient from "./AdDetailClient";
import OtherAdvertiserAds from "./OtherAdvertiserAds";
import JsonLd, { adOfferSchema, breadcrumbSchema } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { COOKIE_NAMES } from "@/lib/cookies";
import { mapPrismaAdToAd } from "@/lib/mappers/ad";
import type { Ad } from "@/lib/types/ad";
import type { ApprovedSubmission } from "@/lib/types/submission";

interface AdPageProps {
  params: Promise<{ id: string }>;
}

const AD_INCLUDE = {
  boosts: {
    where: { expiresAt: { gt: new Date() } },
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
  escrowAccount: {
    select: {
      initialAmount: true,
      spentAmount: true,
      reservedAmount: true,
      available: true,
      status: true,
    },
  },
  videoFormat: { select: { id: true, key: true, label: true, icon: true } },
  adFormat: { select: { id: true, key: true, label: true, icon: true } },
  adSubject: { select: { id: true, key: true, label: true, icon: true } },
  city: { select: { id: true, key: true, label: true } },
  category: { select: { id: true, key: true, label: true } },
} as const;

async function getAd(id: string): Promise<Ad | null> {
  try {
    const raw = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
      include: AD_INCLUDE,
    });
    if (!raw) return null;
    return mapPrismaAdToAd(raw);
  } catch {
    return null;
  }
}

/** Инкрементирует viewCount, пропуская автора объявления */
function trackView(adId: string, ownerId: string, visitorId?: string) {
  if (visitorId && visitorId === ownerId) return;
  prisma.ad
    .update({ where: { id: adId }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});
}

async function getOtherAdvertiserAds(
  ownerId: string,
  currentId: string,
): Promise<Ad[]> {
  try {
    const raws = await prisma.ad.findMany({
      where: {
        ownerId,
        id: { not: currentId },
        deletedAt: null,
        status: "active",
      },
      include: AD_INCLUDE,
      orderBy: { publishedAt: "desc" },
      take: 6,
    });
    return raws.map(mapPrismaAdToAd);
  } catch {
    return [];
  }
}

async function getRelatedAds(
  currentId: string,
  platform: string,
  category: string,
): Promise<Ad[]> {
  try {
    // Get category ID from label
    let categoryId: string | undefined;
    if (category) {
      const catRecord = await prisma.category.findFirst({
        where: { label: category },
      });
      categoryId = catRecord?.id;
    }

    const raws = await prisma.ad.findMany({
      where: {
        id: { not: currentId },
        deletedAt: null,
        status: "active",
        platform: platform as Ad["platform"],
        ...(categoryId ? { categoryId } : {}),
      },
      include: AD_INCLUDE,
      orderBy: { publishedAt: "desc" },
      take: 6,
    });
    return raws.map(mapPrismaAdToAd);
  } catch {
    return [];
  }
}

async function getApprovedSubmissions(
  adId: string,
): Promise<ApprovedSubmission[]> {
  try {
    const rows = await prisma.videoSubmission.findMany({
      where: { adId, status: "approved" },
      select: {
        id: true,
        videoUrl: true,
        screenshotUrl: true,
        approvedViews: true,
        payoutAmount: true,
        moderatedAt: true,
      },
      orderBy: { moderatedAt: "asc" },
    });
    return rows.map((r) => ({
      ...r,
      moderatedAt: r.moderatedAt ? r.moderatedAt.toISOString() : null,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: AdPageProps) {
  const { id } = await params;
  const ad = await getAd(id);
  if (!ad) return { title: "Объявление не найдено" };
  const keywords = [
    ad.title,
    ad.platform,
    ad.city || "Казахстан",
    ad.category || "реклама",
    "видеореклама",
    "блогеры",
    "жарнама",
  ].filter(Boolean);

  const desc = ad.description?.length > 155 ? ad.description.slice(0, 155) + "…" : ad.description;

  return {
    title: `${ad.title} — Zharnamarket`,
    description: desc,
    keywords,
    openGraph: {
      title: `${ad.title} — Zharnamarket`,
      description: desc,
      type: "article",
      url: `https://zharnamarket.kz/ads/${id}`,
      ...(ad.publishedAt && { publishedTime: ad.publishedAt }),
    },
    alternates: {
      canonical: `/ads/${id}`,
    },
  };
}

export default async function AdPage({ params }: AdPageProps) {
  const { id } = await params;

  const ad = await getAd(id);
  if (!ad) notFound();

  // Трекаем просмотр один раз, пропуская автора
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const jwt = accessToken ? await verifyToken(accessToken) : null;
  trackView(ad.id, ad.ownerId, jwt?.sub ?? undefined);

  const [related, otherByAdvertiser, approvedSubmissions] = await Promise.all([
    getRelatedAds(id, ad.platform, ad.category),
    getOtherAdvertiserAds(ad.ownerId, id),
    ad.paymentMode === "escrow"
      ? getApprovedSubmissions(id)
      : Promise.resolve([] as ApprovedSubmission[]),
  ]);

  const totalApprovedViews = approvedSubmissions.reduce(
    (sum, s) => sum + (s.approvedViews ?? 0),
    0,
  );

  return (
    <PublicLayout>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Главная", url: "https://zharnamarket.kz" },
            { name: "Объявления", url: "https://zharnamarket.kz/ads" },
            { name: ad.title, url: `https://zharnamarket.kz/ads/${ad.id}` },
          ]),
          adOfferSchema({
            id: ad.id,
            title: ad.title,
            description: ad.description,
            platform: ad.platform,
            budgetFrom: ad.budgetFrom,
            budgetTo: ad.budgetTo,
            city: ad.city,
            category: ad.category,
            ownerName: ad.companyName,
            publishedAt: ad.publishedAt,
          }),
        ]}
      />
      <AdDetailClient
        ad={ad}
        relatedAds={related}
        approvedSubmissions={approvedSubmissions}
        totalApprovedViews={totalApprovedViews}
      />
      {otherByAdvertiser.length > 0 && (
        <div className="max-w-6xl mx-auto mt-8">
          <OtherAdvertiserAds ads={otherByAdvertiser} />
        </div>
      )}
    </PublicLayout>
  );
}
