"use client";

import Link from "next/link";
import { Button, Spin, Input } from "antd";
import {
  ThunderboltOutlined,
  TeamOutlined,
  HourglassOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import type { TaskApplication } from "@/lib/types/submission";
import { formatTimeLeft } from "./ad-utils";

interface EscrowApplicationPanelProps {
  adId: string;
  application: TaskApplication | null;
  loading: boolean;
  applying: boolean;
  videoUrlInput: string;
  videoUrlSubmitting: boolean;
  isLoggedIn: boolean;
  isOwner: boolean;
  rpm: number | null;
  onApply: () => void;
  onVideoUrlChange: (val: string) => void;
  onSubmitVideoUrl: () => void;
}

export default function EscrowApplicationPanel({
  adId,
  application,
  loading,
  applying,
  videoUrlInput,
  videoUrlSubmitting,
  isLoggedIn,
  isOwner,
  rpm,
  onApply,
  onVideoUrlChange,
  onSubmitVideoUrl,
}: EscrowApplicationPanelProps) {
  if (isOwner) {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-2">
          Вы — владелец этого задания
        </p>
        <Link href={`/ads/${adId}/applications`}>
          <Button icon={<TeamOutlined />} block>
            Управление заявками
          </Button>
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-2">
          Войдите чтобы откликнуться на задание
        </p>
        <Link href="/auth/login">
          <Button type="primary" block icon={<ThunderboltOutlined />}>
            Войти
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Spin size="small" />
      </div>
    );
  }

  if (!application) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Участие в задании
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Снимите видео по ТЗ, прикрепите ссылку и получите выплату за просмотры
          {rpm ? ` (${rpm} ₸ / 1 000 просм.)` : ""}
        </p>
        <Button
          type="primary"
          block
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={onApply}
          loading={applying}
          className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600"
        >
          Откликнуться
        </Button>
      </div>
    );
  }

  // ── Application states ──────────────────────────────────────────

  if (application.contentStatus === "pending_video") {
    const timeLeft = formatTimeLeft(application.videoDeadline);
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HourglassOutlined className="text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">
            Прикрепите видео
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          Опубликуйте видео по ТЗ и вставьте ссылку на него.
        </p>
        {timeLeft && (
          <p className="text-xs text-amber-600 font-medium mb-3">
            Осталось: {timeLeft}
          </p>
        )}
        <Input
          prefix={<LinkOutlined className="text-gray-400" />}
          placeholder="https://tiktok.com/..."
          value={videoUrlInput}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          className="mb-2"
          size="middle"
        />
        <Button
          type="primary"
          block
          icon={<VideoCameraOutlined />}
          onClick={onSubmitVideoUrl}
          loading={videoUrlSubmitting}
          disabled={!videoUrlInput.trim()}
          className="bg-blue-500 hover:bg-blue-600 border-blue-500"
        >
          Прикрепить видео
        </Button>
      </div>
    );
  }

  if (application.contentStatus === "video_timed_out") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CloseCircleOutlined className="text-red-400" />
          <span className="text-sm font-semibold text-gray-700">
            Время истекло
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          48 часов на прикрепление видео прошло. Вы можете подать новую заявку.
        </p>
        <Button
          type="default"
          block
          icon={<ThunderboltOutlined />}
          onClick={onApply}
          loading={applying}
        >
          Откликнуться снова
        </Button>
      </div>
    );
  }

  if (application.contentStatus === "pending_review") {
    const timeLeft = formatTimeLeft(application.contentReviewDeadline);
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HourglassOutlined className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">
            Видео на проверке
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          Заказчик проверяет ваше видео. Если он не ответит в течение 72 часов —
          видео будет одобрено автоматически.
        </p>
        {timeLeft && (
          <p className="text-xs text-blue-600 font-medium mb-2">
            Осталось: {timeLeft}
          </p>
        )}
        {application.videoUrl && (
          <a
            href={application.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-700 truncate"
          >
            <LinkOutlined />
            <span className="truncate">{application.videoUrl}</span>
          </a>
        )}
      </div>
    );
  }

  if (application.contentStatus === "content_rejected") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CloseCircleOutlined className="text-red-500" />
          <span className="text-sm font-semibold text-red-600">
            Видео отклонено
          </span>
        </div>
        {application.contentRejectionNote && (
          <p className="text-xs text-gray-500 bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
            {application.contentRejectionNote}
          </p>
        )}
        <p className="text-xs text-gray-400 mb-3">
          Вы можете снять новое видео и подать заявку повторно.
        </p>
        <Button
          type="default"
          block
          icon={<ThunderboltOutlined />}
          onClick={onApply}
          loading={applying}
        >
          Подать новое видео
        </Button>
      </div>
    );
  }

  if (application.contentStatus === "content_approved") {
    if (!application.submission) {
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckOutlined className="text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">
              Видео одобрено!
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Теперь прикрепите скриншот статистики, чтобы получить выплату за
            просмотры.
          </p>
          <Link href={`/tasks/${adId}/submit`}>
            <Button
              type="primary"
              block
              icon={<FileImageOutlined />}
              className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500"
            >
              Подать статистику
            </Button>
          </Link>
        </div>
      );
    }

    const sub = application.submission;
    const submissionColors: Record<string, string> = {
      submitted: "text-blue-600",
      approved: "text-emerald-600",
      rejected: "text-red-600",
      rejected_system: "text-red-600",
    };
    const submissionLabels: Record<string, string> = {
      submitted: "На модерации",
      approved: "Одобрено",
      rejected: "Отклонено",
      rejected_system: "Отклонено системой",
    };

    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileImageOutlined
            className={`text-base ${submissionColors[sub.status] ?? "text-gray-500"}`}
          />
          <span
            className={`text-sm font-semibold ${submissionColors[sub.status] ?? "text-gray-700"}`}
          >
            {submissionLabels[sub.status] ?? sub.status}
          </span>
        </div>
        {sub.claimedViews && (
          <p className="text-xs text-gray-500">
            Просмотры: {sub.claimedViews.toLocaleString("ru-RU")}
            {sub.approvedViews != null &&
              ` → Засчитано: ${sub.approvedViews.toLocaleString("ru-RU")}`}
          </p>
        )}
        {sub.payoutAmount != null && sub.status === "approved" && (
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            Выплата: {sub.payoutAmount.toLocaleString("ru-RU")} ₸
          </p>
        )}
      </div>
    );
  }

  return null;
}
