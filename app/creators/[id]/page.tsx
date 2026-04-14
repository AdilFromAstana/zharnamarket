import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import CreatorDetailClient from "./CreatorDetailClient";
import { prisma } from "@/lib/prisma";

interface CreatorPageProps {
  params: Promise<{ id: string }>;
}

async function fetchCreator(id: string) {
  try {
    // Прямой Prisma запрос — без HTTP-hop к собственному API
    const raw = await prisma.creatorProfile.findFirst({
      where: { id, isPublished: true },
      include: {
        platforms: true,
        portfolio: { orderBy: { createdAt: "desc" } },
        priceItems: { orderBy: { sortOrder: "asc" } },
        boosts: { where: { expiresAt: { gte: new Date() } } },
        user: { select: { avatarColor: true } },
      },
    });
    if (!raw) return null;

    // Агрегация escrow-статистики по VideoSubmission
    const [approvedCount, decidedCount] = await Promise.all([
      prisma.videoSubmission.count({
        where: { creatorId: raw.userId, status: "approved" },
      }),
      prisma.videoSubmission.count({
        where: {
          creatorId: raw.userId,
          status: { in: ["approved", "rejected", "rejected_system"] },
        },
      }),
    ]);

    const stats =
      approvedCount > 0
        ? {
            completedOrders: approvedCount,
            successRate:
              decidedCount > 0
                ? Math.round((approvedCount / decidedCount) * 100)
                : null,
          }
        : undefined;

    return mapCreatorFromApi({ ...raw, stats });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: CreatorPageProps) {
  const { id } = await params;
  const creator = await fetchCreator(id);
  if (!creator) return { title: "Профиль не найден" };
  return {
    title: `${creator.fullName} — ViralAds PARTNER`,
    description: creator.bio || `${creator.fullName}, ${creator.city}`,
    openGraph: {
      title: `${creator.fullName} — ViralAds PARTNER`,
      description: creator.bio || `${creator.fullName}, ${creator.city}`,
    },
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { id } = await params;
  const creator = await fetchCreator(id);

  if (!creator) {
    notFound();
  }

  return (
    <PublicLayout>
      <CreatorDetailClient creator={creator} />
    </PublicLayout>
  );
}
