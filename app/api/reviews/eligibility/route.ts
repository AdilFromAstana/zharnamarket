import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reviews/eligibility?creatorProfileId={id}
// Проверяет, может ли текущий пользователь оставить отзыв на профиль креатора
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const creatorProfileId = searchParams.get("creatorProfileId");
    if (!creatorProfileId) return badRequest("creatorProfileId обязателен");

    // Проверяем что профиль существует
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, userId: true, isPublished: true },
    });

    if (!profile || !profile.isPublished) {
      return NextResponse.json({
        eligible: false,
        hasInteraction: false,
        hasExistingReview: false,
        reason: "Профиль не найден или не опубликован",
      });
    }

    // Нельзя оставить отзыв на свой профиль
    if (profile.userId === userId) {
      return NextResponse.json({
        eligible: false,
        hasInteraction: false,
        hasExistingReview: false,
        reason: "Нельзя оставить отзыв на свой профиль",
      });
    }

    const [interaction, existingReview] = await Promise.all([
      prisma.contactInteraction.findUnique({
        where: {
          userId_creatorProfileId: {
            userId,
            creatorProfileId,
          },
        },
      }),
      prisma.review.findUnique({
        where: {
          reviewerId_targetType_targetId: {
            reviewerId: userId,
            targetType: "creator_profile",
            targetId: creatorProfileId,
          },
        },
      }),
    ]);

    const hasInteraction = !!interaction;
    const hasExistingReview = !!existingReview;

    if (hasExistingReview) {
      return NextResponse.json({
        eligible: false,
        hasInteraction,
        hasExistingReview: true,
        reason: "Вы уже оставили отзыв на этот профиль",
      });
    }

    if (!hasInteraction) {
      return NextResponse.json({
        eligible: false,
        hasInteraction: false,
        hasExistingReview: false,
        reason: "Чтобы оставить отзыв, сначала свяжитесь с креатором",
      });
    }

    return NextResponse.json({
      eligible: true,
      hasInteraction: true,
      hasExistingReview: false,
    });
  } catch (err) {
    console.error("[GET /api/reviews/eligibility]", err);
    return serverError();
  }
}
