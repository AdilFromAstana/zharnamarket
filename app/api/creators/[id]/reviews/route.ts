import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeInt } from "@/lib/validation";

// GET /api/creators/[id]/reviews — список отзывов на профиль креатора
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 10));
    const skip = (page - 1) * limit;

    // Проверяем что профиль существует
    const profile = await prisma.creatorProfile.findUnique({
      where: { id },
      select: { id: true, averageRating: true, reviewCount: true },
    });
    if (!profile) return notFound("Профиль не найден");

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { targetType: "creator_profile", targetId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true, avatarColor: true },
          },
        },
      }),
      prisma.review.count({
        where: { targetType: "creator_profile", targetId: id },
      }),
    ]);

    // Распределение рейтингов
    const ratingGroups = await prisma.review.groupBy({
      by: ["rating"],
      where: { targetType: "creator_profile", targetId: id },
      _count: { rating: true },
    });
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const g of ratingGroups) {
      ratingDistribution[g.rating] = g._count.rating;
    }

    return NextResponse.json({
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      averageRating: profile.averageRating,
      ratingDistribution,
    });
  } catch (err) {
    console.error("[GET /api/creators/[id]/reviews]", err);
    return serverError();
  }
}

// POST /api/creators/[id]/reviews — создать отзыв
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;

    // Проверяем что профиль существует и опубликован
    const profile = await prisma.creatorProfile.findUnique({
      where: { id },
      select: { id: true, userId: true, isPublished: true },
    });
    if (!profile) return notFound("Профиль не найден");
    if (!profile.isPublished) return badRequest("Профиль не опубликован");

    // Нельзя оставить отзыв на свой профиль
    if (profile.userId === userId) {
      return badRequest("Нельзя оставить отзыв на свой профиль");
    }

    // Проверяем что пользователь связывался с креатором (ContactInteraction)
    const interaction = await prisma.contactInteraction.findUnique({
      where: {
        userId_creatorProfileId: {
          userId,
          creatorProfileId: id,
        },
      },
    });
    if (!interaction) {
      return badRequest("Чтобы оставить отзыв, сначала свяжитесь с креатором");
    }

    const body = await req.json();
    const { rating, comment } = body;

    // Валидация
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return badRequest("Рейтинг должен быть от 1 до 5");
    }
    if (!comment?.trim() || comment.trim().length < 10) {
      return badRequest("Комментарий должен быть не менее 10 символов");
    }
    if (comment.trim().length > 2000) {
      return badRequest("Комментарий не должен превышать 2000 символов");
    }

    // Проверяем уникальность (один отзыв на профиль от одного пользователя)
    const existing = await prisma.review.findUnique({
      where: {
        reviewerId_targetType_targetId: {
          reviewerId: userId,
          targetType: "creator_profile",
          targetId: id,
        },
      },
    });
    if (existing) {
      return badRequest("Вы уже оставили отзыв на этот профиль");
    }

    // Создаём отзыв
    const review = await prisma.review.create({
      data: {
        reviewerId: userId,
        targetType: "creator_profile",
        targetId: id,
        creatorProfileId: id,
        rating: Math.round(rating),
        comment: comment.trim(),
      },
      include: {
        reviewer: {
          select: { id: true, name: true, avatar: true, avatarColor: true },
        },
      },
    });

    // Пересчитываем рейтинг профиля
    const stats = await prisma.review.aggregate({
      where: { targetType: "creator_profile", targetId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.creatorProfile.update({
      where: { id },
      data: {
        averageRating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        reviewCount: stats._count.rating,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    console.error("[POST /api/creators/[id]/reviews]", err);
    return serverError();
  }
}
