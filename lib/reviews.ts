import { prisma } from "@/lib/prisma";

/**
 * Пересчитывает averageRating и reviewCount на CreatorProfile
 * после создания, обновления или удаления отзыва.
 */
export async function recalculateCreatorRating(
  creatorProfileId: string,
): Promise<{ averageRating: number; reviewCount: number }> {
  const stats = await prisma.review.aggregate({
    where: {
      targetType: "creator_profile",
      targetId: creatorProfileId,
    },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const averageRating = Math.round((stats._avg.rating ?? 0) * 10) / 10;
  const reviewCount = stats._count.rating;

  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: { averageRating, reviewCount },
  });

  return { averageRating, reviewCount };
}

/**
 * Получает распределение оценок (1-5) для креатора.
 */
export async function getRatingDistribution(
  creatorProfileId: string,
): Promise<Record<number, number>> {
  const groups = await prisma.review.groupBy({
    by: ["rating"],
    where: {
      targetType: "creator_profile",
      targetId: creatorProfileId,
    },
    _count: { rating: true },
  });

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of groups) {
    distribution[g.rating] = g._count.rating;
  }
  return distribution;
}
