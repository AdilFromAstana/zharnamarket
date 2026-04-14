"use client";

import { useState } from "react";
import { Button, Input } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import type { Review } from "@/lib/types/creator";
import { api } from "@/lib/api-client";
import StarRating from "./StarRating";

interface ReviewFormProps {
  creatorProfileId: string;
  onSubmitted: (review: Review) => void;
}

export default function ReviewForm({
  creatorProfileId,
  onSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Поставьте оценку от 1 до 5");
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      toast.error("Комментарий должен быть не менее 10 символов");
      return;
    }

    setSubmitting(true);
    try {
      const review = await api.post<Review>(
        `/api/creators/${creatorProfileId}/reviews`,
        { rating, comment: comment.trim() },
      );
      onSubmitted(review);
      setRating(0);
      setComment("");
      toast.success("Отзыв опубликован!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка при отправке отзыва";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Оставить отзыв
      </h3>

      {/* Rating selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1.5 block">Ваша оценка</label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onRate={setRating}
        />
      </div>

      {/* Comment */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1.5 block">Комментарий</label>
        <Input.TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Расскажите о вашем опыте работы с этим креатором..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          maxLength={2000}
          showCount
        />
      </div>

      {/* Submit */}
      <Button
        type="primary"
        icon={<SendOutlined />}
        loading={submitting}
        onClick={handleSubmit}
        disabled={rating === 0 || comment.trim().length < 10}
        style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
      >
        Опубликовать отзыв
      </Button>
    </div>
  );
}
