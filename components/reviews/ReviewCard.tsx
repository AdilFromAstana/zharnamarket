"use client";

import { useState } from "react";
import { Button, Input, Dropdown } from "antd";
import { DeleteOutlined, SendOutlined, MoreOutlined, FlagOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import type { Review } from "@/lib/types/creator";
import { api } from "@/lib/api-client";
import StarRating from "./StarRating";
import { formatRelative, getAvatarGradient, cn } from "@/lib/utils";
import ReportModal from "@/components/report/ReportModal";

interface ReviewCardProps {
  review: Review;
  currentUserId?: string | null;
  isProfileOwner?: boolean;
  onUpdated?: (review: Review) => void;
  onDeleted?: (reviewId: string) => void;
}

export default function ReviewCard({
  review,
  currentUserId,
  isProfileOwner = false,
  onUpdated,
  onDeleted,
}: ReviewCardProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isAuthor = currentUserId === review.reviewerId;
  const canReply = isProfileOwner && !review.reply;
  const canDelete = isAuthor;

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const updated = await api.put<Review>(`/api/reviews/${review.id}`, {
        reply: replyText.trim(),
      });
      onUpdated?.(updated);
      setReplying(false);
      setReplyText("");
      toast.success("Ответ опубликован");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/reviews/${review.id}`);
      onDeleted?.(review.id);
      toast.success("Отзыв удалён");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const initials = review.reviewer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {review.reviewer.avatar ? (
            <img
              src={review.reviewer.avatar}
              alt={review.reviewer.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold", review.reviewer.avatarColor ?? getAvatarGradient(review.reviewer.name))}>
              {initials}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {review.reviewer.name}
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-gray-400">
                {formatRelative(review.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canDelete && (
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              loading={deleting}
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500"
              title="Удалить отзыв"
            />
          )}
          {!isAuthor && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "report",
                    label: "Пожаловаться",
                    icon: <FlagOutlined />,
                    danger: true,
                    onClick: () => setReportOpen(true),
                  },
                ],
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                className="text-gray-400 hover:text-gray-600"
              />
            </Dropdown>
          )}
        </div>
      </div>

      {/* Comment */}
      <p className="text-sm text-gray-700 mt-3 leading-relaxed">
        {review.comment}
      </p>

      {/* Reply */}
      {review.reply && (
        <div className="mt-3 ml-4 pl-3 border-l-2 border-sky-200 bg-sky-50 rounded-r-lg p-3">
          <div className="text-xs font-medium text-sky-700 mb-1">
            Ответ креатора
          </div>
          <p className="text-sm text-gray-700">{review.reply}</p>
          {review.repliedAt && (
            <span className="text-xs text-gray-400 mt-1 block">
              {formatRelative(review.repliedAt)}
            </span>
          )}
        </div>
      )}

      {/* Reply form */}
      {canReply && !replying && (
        <button
          onClick={() => setReplying(true)}
          className="mt-2 text-xs text-sky-600 hover:text-sky-700 font-medium"
        >
          Ответить на отзыв
        </button>
      )}

      {replying && (
        <div className="mt-3 flex gap-2">
          <Input.TextArea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Ваш ответ на отзыв..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={1000}
            className="flex-1"
          />
          <div className="flex flex-col gap-1">
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleReply}
              disabled={!replyText.trim()}
              style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
            >
              Отправить
            </Button>
            <Button
              type="text"
              size="small"
              onClick={() => {
                setReplying(false);
                setReplyText("");
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="review"
        targetId={review.id}
      />
    </div>
  );
}
