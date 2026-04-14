"use client";

import { useState } from "react";
import { Modal, Input, Radio, Button } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { api, ApiError, isAuthenticated } from "@/lib/api-client";

export type ReportTargetType = "ad" | "creator" | "customer" | "review";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASONS = [
  { value: "spam", label: "Спам" },
  { value: "inappropriate", label: "Неуместный контент" },
  { value: "fake", label: "Фейк / недостоверная информация" },
  { value: "scam", label: "Мошенничество" },
  { value: "harassment", label: "Оскорбления / харассмент" },
  { value: "other", label: "Другое" },
] as const;

const TARGET_LABELS: Record<ReportTargetType, string> = {
  ad: "объявление",
  creator: "креатора",
  customer: "пользователя",
  review: "отзыв",
};

export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Выберите причину жалобы");
      return;
    }

    if (!isAuthenticated()) {
      toast.error("Войдите в аккаунт, чтобы отправить жалобу");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/reports", {
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      });
      toast.success("Жалоба отправлена на рассмотрение");
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          toast.error("Подождите перед повторной отправкой жалобы");
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("Не удалось отправить жалобу");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <div className="flex items-center gap-2">
          <WarningOutlined className="text-red-500" />
          <span>Пожаловаться на {TARGET_LABELS[targetType]}</span>
        </div>
      }
      footer={null}
      width={460}
      destroyOnHidden
    >
      <div className="mt-4 space-y-4">
        {/* Причина */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Причина жалобы
          </p>
          <Radio.Group
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full"
          >
            <div className="space-y-2">
              {REASONS.map((r) => (
                <div
                  key={r.value}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    reason === r.value
                      ? "border-red-300 bg-red-50"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                  }`}
                  onClick={() => setReason(r.value)}
                >
                  <Radio value={r.value}>
                    <span className="text-sm text-gray-700">{r.label}</span>
                  </Radio>
                </div>
              ))}
            </div>
          </Radio.Group>
        </div>

        {/* Описание */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Подробности{" "}
            <span className="text-gray-400 font-normal">(необязательно)</span>
          </p>
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите проблему подробнее..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={2000}
            showCount
          />
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            type="primary"
            danger
            onClick={handleSubmit}
            loading={submitting}
            disabled={!reason}
          >
            Отправить жалобу
          </Button>
        </div>
      </div>
    </Modal>
  );
}
