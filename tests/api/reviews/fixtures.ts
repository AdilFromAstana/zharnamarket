/**
 * Shared fixtures for review tests.
 * All helpers create data in the real DB and return created entities.
 * Clean up by deleting the owning Users (cascade handles the rest).
 */

import { prisma } from "@/lib/prisma";
import { cityId } from "../refs";

// ─── Creator Profile ─────────────────────────────────────────────────────────

export async function createPublishedProfile(userId: string) {
  return prisma.creatorProfile.create({
    data: {
      userId,
      title: "Test Creator Profile",
      fullName: "Test Creator",
      isPublished: true,
      cityId: await cityId("Almaty"),
      availability: "available",
      minimumRate: 50_000,
      currency: "KZT",
    },
  });
}

export async function createUnpublishedProfile(userId: string) {
  return prisma.creatorProfile.create({
    data: {
      userId,
      title: "Unpublished Creator Profile",
      fullName: "Hidden Creator",
      isPublished: false,
      cityId: await cityId("Almaty"),
      availability: "available",
      minimumRate: 10_000,
      currency: "KZT",
    },
  });
}

// ─── Contact Interaction ──────────────────────────────────────────────────────

export async function createInteraction(userId: string, creatorProfileId: string) {
  return prisma.contactInteraction.create({
    data: { userId, creatorProfileId },
  });
}

// ─── Review ──────────────────────────────────────────────────────────────────

export async function createReview(
  reviewerId: string,
  creatorProfileId: string,
  overrides: Partial<{
    rating: number;
    comment: string;
    reply: string | null;
    repliedAt: Date | null;
  }> = {},
) {
  const review = await prisma.review.create({
    data: {
      reviewerId,
      targetType: "creator_profile",
      targetId: creatorProfileId,
      creatorProfileId,
      rating: overrides.rating ?? 4,
      comment: overrides.comment ?? "Очень доволен сотрудничеством! Всё сделано вовремя.",
      reply: overrides.reply ?? null,
      repliedAt: overrides.repliedAt ?? null,
    },
  });

  // Sync aggregated fields on CreatorProfile
  await recalcProfileRating(creatorProfileId);

  return review;
}

// ─── Recalculate aggregated rating (mirrors the API logic) ───────────────────

export async function recalcProfileRating(creatorProfileId: string) {
  const stats = await prisma.review.aggregate({
    where: { targetType: "creator_profile", targetId: creatorProfileId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: {
      averageRating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
      reviewCount: stats._count.rating,
    },
  });
}

// ─── Cleanup helpers ─────────────────────────────────────────────────────────

/** Delete users by ID — cascades to profiles, reviews, interactions. */
export async function deleteUsers(...ids: (string | undefined)[]) {
  const valid = ids.filter((id): id is string => !!id);
  if (valid.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: valid } } });
  }
}
