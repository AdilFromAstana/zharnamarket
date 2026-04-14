import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateCreatorRating } from "@/lib/reviews";

// PUT /api/reviews/[id] — обновить отзыв (автор) или добавить ответ (владелец профиля)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        creatorProfile: { select: { userId: true } },
      },
    });
    if (!review) return notFound("Отзыв не найден");

    const body = await req.json();
    const isAuthor = review.reviewerId === userId;
    const isProfileOwner = review.creatorProfile?.userId === userId;

    // Автор может обновить рейтинг и комментарий
    if (isAuthor) {
      const { rating, comment } = body;

      if (rating !== undefined) {
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
          return badRequest("Рейтинг должен быть от 1 до 5");
        }
      }
      if (comment !== undefined) {
        if (!comment?.trim() || comment.trim().length < 10) {
          return badRequest("Комментарий должен быть не менее 10 символов");
        }
        if (comment.trim().length > 2000) {
          return badRequest("Комментарий не должен превышать 2000 символов");
        }
      }

      const updated = await prisma.review.update({
        where: { id },
        data: {
          ...(rating !== undefined && { rating: Math.round(rating) }),
          ...(comment !== undefined && { comment: comment.trim() }),
        },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true, avatarColor: true },
          },
        },
      });

      // Пересчитываем рейтинг если изменился
      if (rating !== undefined) {
        await recalculateCreatorRating(review.targetId);
      }

      return NextResponse.json(updated);
    }

    // Владелец профиля может добавить ответ (один раз)
    if (isProfileOwner) {
      const { reply } = body;

      if (!reply?.trim()) {
        return badRequest("Ответ не может быть пустым");
      }
      if (reply.trim().length > 1000) {
        return badRequest("Ответ не должен превышать 1000 символов");
      }
      if (review.reply) {
        return badRequest("Ответ уже был оставлен");
      }

      const updated = await prisma.review.update({
        where: { id },
        data: {
          reply: reply.trim(),
          repliedAt: new Date(),
        },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true, avatarColor: true },
          },
        },
      });

      return NextResponse.json(updated);
    }

    return forbidden("Нет прав на редактирование этого отзыва");
  } catch (err) {
    console.error("[PUT /api/reviews/[id]]", err);
    return serverError();
  }
}

// DELETE /api/reviews/[id] — удалить отзыв (автор или админ)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return notFound("Отзыв не найден");

    // Проверяем права: автор или админ
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (review.reviewerId !== userId && user?.role !== "admin") {
      return forbidden("Нет прав на удаление этого отзыва");
    }

    await prisma.review.delete({ where: { id } });

    // Пересчитываем рейтинг
    await recalculateCreatorRating(review.targetId);

    return NextResponse.json({ message: "Отзыв удалён" });
  } catch (err) {
    console.error("[DELETE /api/reviews/[id]]", err);
    return serverError();
  }
}
