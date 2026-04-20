"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Spin } from "antd";
import { StarFilled, MessageOutlined } from "@ant-design/icons";
import type { Review, ReviewsResponse } from "@/lib/types/creator";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import StarRating from "./StarRating";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";

interface ReviewsSectionProps {
  creatorProfileId: string;
  creatorUserId: string;
}

export default function ReviewsSection({
  creatorProfileId,
  creatorUserId,
}: ReviewsSectionProps) {
  const { user, isLoggedIn } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<
    Record<number, number>
  >({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [hasContactInteraction, setHasContactInteraction] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const isProfileOwner = user?.id === creatorUserId;

  const fetchReviews = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const data = await api.get<ReviewsResponse>(
          `/api/creators/${creatorProfileId}/reviews?page=${pageNum}&limit=10`,
        );
        if (pageNum === 1) {
          setReviews(data.data);
        } else {
          setReviews((prev) => [...prev, ...data.data]);
        }
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        setAverageRating(data.averageRating);
        setRatingDistribution(data.ratingDistribution);

        // Проверяем есть ли отзыв текущего пользователя
        if (user) {
          const userReview = data.data.find((r) => r.reviewerId === user.id);
          if (userReview) setHasExistingReview(true);
        }
      } catch {
        // ошибка загрузки отзывов
      } finally {
        setLoading(false);
      }
    },
    [creatorProfileId, user],
  );

  // Проверяем право на отзыв через eligibility API
  useEffect(() => {
    if (!isLoggedIn || isProfileOwner) return;
    api
      .get<{
        eligible: boolean;
        hasInteraction: boolean;
        hasExistingReview: boolean;
        reason?: string;
      }>(`/api/reviews/eligibility?creatorProfileId=${creatorProfileId}`)
      .then((data) => {
        setHasContactInteraction(data.hasInteraction);
        if (data.hasExistingReview) setHasExistingReview(true);
      })
      .catch(() => {
        // Если запрос не удался — запрещаем форму
        setHasContactInteraction(false);
      });
  }, [isLoggedIn, isProfileOwner, creatorProfileId]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleReviewSubmitted = (review: Review) => {
    setReviews((prev) => [review, ...prev]);
    setTotal((prev) => prev + 1);
    setHasExistingReview(true);
    // Пересчитаем средний рейтинг на клиенте
    const newTotal = total + 1;
    const newAvg = (averageRating * total + review.rating) / newTotal;
    setAverageRating(Math.round(newAvg * 10) / 10);
    const newDist = { ...ratingDistribution };
    newDist[review.rating] = (newDist[review.rating] ?? 0) + 1;
    setRatingDistribution(newDist);
  };

  const handleReviewUpdated = (updated: Review) => {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleReviewDeleted = (reviewId: string) => {
    const deleted = reviews.find((r) => r.id === reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setTotal((prev) => prev - 1);
    setHasExistingReview(false);
    if (deleted) {
      const newTotal = total - 1;
      const newAvg =
        newTotal > 0 ? (averageRating * total - deleted.rating) / newTotal : 0;
      setAverageRating(Math.round(newAvg * 10) / 10);
      const newDist = { ...ratingDistribution };
      newDist[deleted.rating] = Math.max(0, (newDist[deleted.rating] ?? 0) - 1);
      setRatingDistribution(newDist);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage);
  };

  const maxDistCount = Math.max(...Object.values(ratingDistribution), 1);

  const canWriteReview =
    isLoggedIn &&
    !isProfileOwner &&
    !hasExistingReview &&
    hasContactInteraction;

  // Компактный пустой state — не занимаем пол-экрана, если отзывов нет и писать некому
  if (!loading && total === 0 && !canWriteReview) {
    return (
      <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 px-4 md:px-5 py-3 flex items-center gap-3">
        <MessageOutlined className="text-gray-400 text-lg shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-700">
            Отзывов пока нет
          </div>
          <div className="text-xs text-gray-500 leading-snug">
            {isProfileOwner
              ? "Ждём первых откликов от заказчиков"
              : !isLoggedIn
                ? "Авторизуйтесь и свяжитесь с креатором, чтобы оставить первый отзыв"
                : "Свяжитесь с креатором — после контакта сможете оставить отзыв"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageOutlined className="text-sky-500" /> Отзывы ({total})
      </h2>

      {/* Rating summary */}
      {total > 0 && (
        <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-100">
          {/* Average */}
          <div className="text-center shrink-0">
            <div className="text-4xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </div>
            <StarRating
              rating={averageRating}
              size="sm"
              className="justify-center mt-1"
            />
            <div className="text-xs text-gray-400 mt-1">
              {total} {total === 1 ? "отзыв" : total < 5 ? "отзыва" : "отзывов"}
            </div>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] ?? 0;
              const width = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3 text-right">
                    {star}
                  </span>
                  <StarFilled className="text-amber-400 text-xs" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review form */}
      {canWriteReview && (
        <div className="mb-6">
          <ReviewForm
            creatorProfileId={creatorProfileId}
            onSubmitted={handleReviewSubmitted}
          />
        </div>
      )}

      {/* Login prompt */}
      {!isLoggedIn && total === 0 && (
        <div className="text-center py-8 text-gray-400">
          <MessageOutlined className="text-3xl mb-2 block" />
          <p className="text-sm">Пока нет отзывов</p>
          <p className="text-xs mt-1">
            Авторизуйтесь и свяжитесь с креатором, чтобы оставить отзыв
          </p>
        </div>
      )}

      {!isLoggedIn && total > 0 && !hasExistingReview && (
        <div className="mb-4 p-3 bg-sky-50 rounded-xl text-center">
          <p className="text-sm text-sky-700">
            Авторизуйтесь и свяжитесь с креатором, чтобы оставить отзыв
          </p>
        </div>
      )}

      {/* Reviews list */}
      {loading && reviews.length === 0 ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id ?? null}
              isProfileOwner={isProfileOwner}
              onUpdated={handleReviewUpdated}
              onDeleted={handleReviewDeleted}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {page < totalPages && (
        <div className="mt-4 text-center">
          <Button
            type="text"
            loading={loading}
            onClick={loadMore}
            className="text-sky-600"
          >
            Показать ещё отзывы
          </Button>
        </div>
      )}

      {/* Empty state (logged in, has reviews=0) */}
      {!loading && total === 0 && isLoggedIn && (
        <div className="text-center py-8 text-gray-400">
          <MessageOutlined className="text-3xl mb-2 block" />
          <p className="text-sm">Пока нет отзывов</p>
          {!isProfileOwner && (
            <p className="text-xs mt-1">
              Свяжитесь с креатором, чтобы потом оставить отзыв
            </p>
          )}
        </div>
      )}
    </div>
  );
}
