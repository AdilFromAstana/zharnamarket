import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import AdDetailClient from "./AdDetailClient";
import OtherAdvertiserAds from "./OtherAdvertiserAds";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
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

    // Инкрементируем просмотры (fire-and-forget)
    prisma.ad
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    return mapPrismaAdToAd(raw);
  } catch {
    return null;
  }
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
  return {
    title: `${ad.title} — Zharnamarket`,
    description: ad.description,
  };
}

export default async function AdPage({ params }: AdPageProps) {
  const { id } = await params;

  const ad = await getAd(id);
  if (!ad) notFound();

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
