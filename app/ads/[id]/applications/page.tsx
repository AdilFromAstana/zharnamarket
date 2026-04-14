"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Tag, Spin, Empty, Divider, Input, Modal } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  HourglassOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  EyeOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, ApiError } from "@/lib/api-client";
import type { TaskApplication } from "@/lib/types/submission";
import PublicLayout from "@/components/layout/PublicLayout";
import { formatRelative } from "@/lib/utils";

const CONTENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending_video: {
    label: "Ожидает видео (48ч)",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <HourglassOutlined className="text-amber-500" />,
  },
  video_timed_out: {
    label: "Время истекло",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
    icon: <ClockCircleOutlined className="text-gray-400" />,
  },
  pending_review: {
    label: "Ожидает вашей проверки",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <HourglassOutlined className="text-blue-500" />,
  },
  content_approved: {
    label: "Видео одобрено",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: <CheckOutlined className="text-emerald-500" />,
  },
  content_rejected: {
    label: "Видео отклонено",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    icon: <CloseOutlined className="text-red-500" />,
  },
};

function formatTimeLeft(deadline: string | null): string {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Истекло";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} дн. ${hours % 24} ч.`;
  }
  return `${hours} ч. ${minutes} мин.`;
}

type FilterStatus = "all" | "pending_review" | "pending_video" | "content_approved" | "content_rejected" | "video_timed_out";

export default function AdApplicationsPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const adId = params.id as string;

  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [adTitle, setAdTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Review modal state
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, adRes] = await Promise.all([
        api.get<{ data: TaskApplication[] }>(`/api/tasks/${adId}/applications`),
        api.get<{ title: string }>(`/api/tasks/${adId}`),
      ]);
      setApplications(appsRes.data);
      setAdTitle(adRes.title ?? "");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 || err.status === 401) {
          toast.error("Нет доступа к этой странице");
          router.replace(`/ads/${adId}`);
          return;
        }
      }
      toast.error("Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  }, [adId, router]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (appId: string) => {
    setReviewing(true);
    try {
      await api.patch(`/api/tasks/${adId}/applications/${appId}/review`, {
        action: "approve",
      });
      toast.success("Видео одобрено! Креатор может подать статистику.");
      await fetchApplications();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка при одобрении");
    } finally {
      setReviewing(false);
    }
  };

  const handleReject = async (appId: string) => {
    if (!rejectNote.trim()) {
      toast.error("Укажите причину отклонения");
      return;
    }
    setReviewing(true);
    try {
      await api.patch(`/api/tasks/${adId}/applications/${appId}/review`, {
        action: "reject",
        note: rejectNote.trim(),
      });
      toast.success("Видео отклонено");
      setReviewingAppId(null);
      setRejectNote("");
      await fetchApplications();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка при отклонении");
    } finally {
      setReviewing(false);
    }
  };

  const filteredApplications =
    filterStatus === "all"
      ? applications
      : applications.filter((a) => a.contentStatus === filterStatus);

  const pendingReviewCount = applications.filter((a) => a.contentStatus === "pending_review").length;

  const filterTabs: { key: FilterStatus; label: string; count?: number }[] = [
    { key: "all", label: "Все", count: applications.length },
    { key: "pending_review", label: "На проверке", count: pendingReviewCount },
    { key: "pending_video", label: "Ожидают видео" },
    { key: "content_approved", label: "Одобрены" },
    { key: "content_rejected", label: "Отклонены" },
    { key: "video_timed_out", label: "Истекли" },
  ];

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto py-12 flex items-center justify-center">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push(`/ads/${adId}`)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeftOutlined />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Заявки на задание</h1>
            {adTitle && (
              <p className="text-sm text-gray-500 mt-0.5 truncate max-w-sm">
                {adTitle}
              </p>
            )}
          </div>
        </div>

        {/* Pending review alert */}
        {pendingReviewCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <ExclamationCircleOutlined className="text-blue-500 text-lg mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                {pendingReviewCount} {pendingReviewCount === 1 ? "заявка ожидает" : "заявки ожидают"} вашей проверки
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Если не ответить в течение 72 часов — видео будет одобрено автоматически
              </p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                filterStatus === tab.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                    filterStatus === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Applications list */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <Empty description="Заявок нет" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredApplications.map((app) => {
              const statusConf = CONTENT_STATUS_CONFIG[app.contentStatus];
              const isPendingReview = app.contentStatus === "pending_review";
              const timeLeft = isPendingReview
                ? formatTimeLeft(app.contentReviewDeadline)
                : app.contentStatus === "pending_video"
                  ? formatTimeLeft(app.videoDeadline)
                  : null;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5"
                >
                  {/* Creator info */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          app.creator?.avatar ??
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(app.creator?.name ?? "C")}&backgroundColor=dbeafe&textColor=1e40af`
                        }
                        alt={app.creator?.name ?? "Креатор"}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {app.creator?.name ?? "Креатор"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Подана {formatRelative(app.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    {statusConf && (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${statusConf.bgColor} ${statusConf.color} shrink-0`}
                      >
                        {statusConf.icon}
                        {statusConf.label}
                      </div>
                    )}
                  </div>

                  {/* Countdown */}
                  {timeLeft && timeLeft !== "Истекло" && (
                    <p className="text-xs font-medium text-amber-600 mb-3">
                      <ClockCircleOutlined className="mr-1" />
                      Осталось: {timeLeft}
                    </p>
                  )}

                  {/* Video link */}
                  {app.videoUrl && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        <VideoCameraOutlined className="mr-1" />
                        Видео:
                      </p>
                      <a
                        href={app.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-700 font-medium truncate"
                      >
                        <LinkOutlined className="shrink-0" />
                        <span className="truncate">{app.videoUrl}</span>
                      </a>
                    </div>
                  )}

                  {/* Rejection note */}
                  {app.contentStatus === "content_rejected" && app.contentRejectionNote && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
                      <p className="text-xs text-red-600 font-medium mb-0.5">Причина отклонения:</p>
                      <p className="text-xs text-red-500">{app.contentRejectionNote}</p>
                    </div>
                  )}

                  {/* VideoSubmission status */}
                  {app.submission && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileImageOutlined className="text-gray-500" />
                        <span className="text-xs font-semibold text-gray-700">
                          Статистика подана
                        </span>
                        <Tag
                          color={
                            app.submission.status === "approved"
                              ? "green"
                              : app.submission.status === "submitted"
                                ? "blue"
                                : "red"
                          }
                          className="m-0 text-[11px]"
                        >
                          {app.submission.status === "approved"
                            ? "Одобрено"
                            : app.submission.status === "submitted"
                              ? "На модерации"
                              : "Отклонено"}
                        </Tag>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <EyeOutlined />
                          Заявлено: {app.submission.claimedViews?.toLocaleString("ru-RU")}
                        </span>
                        {app.submission.approvedViews != null && (
                          <span className="text-emerald-600 font-medium">
                            Засчитано: {app.submission.approvedViews.toLocaleString("ru-RU")}
                          </span>
                        )}
                        {app.submission.payoutAmount != null && app.submission.status === "approved" && (
                          <span className="text-emerald-600 font-semibold">
                            Выплата: {app.submission.payoutAmount.toLocaleString("ru-RU")} ₸
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons for pending_review */}
                  {isPendingReview && (
                    <>
                      <Divider className="my-3" />
                      <div className="flex gap-2">
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={() => handleApprove(app.id)}
                          loading={reviewing}
                          className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 flex-1"
                        >
                          Одобрить
                        </Button>
                        <Button
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => {
                            setReviewingAppId(app.id);
                            setRejectNote("");
                          }}
                          className="flex-1"
                        >
                          Отклонить
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reject modal */}
        <Modal
          open={!!reviewingAppId}
          title="Причина отклонения"
          onCancel={() => {
            setReviewingAppId(null);
            setRejectNote("");
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setReviewingAppId(null);
                setRejectNote("");
              }}
            >
              Отмена
            </Button>,
            <Button
              key="submit"
              danger
              type="primary"
              loading={reviewing}
              onClick={() => reviewingAppId && handleReject(reviewingAppId)}
            >
              Отклонить видео
            </Button>,
          ]}
        >
          <p className="text-sm text-gray-600 mb-3">
            Объясните, почему видео не соответствует требованиям задания. Креатор увидит ваш комментарий.
          </p>
          <Input.TextArea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Например: Продукт не упомянут, нет хэштегов, не соответствует тематике..."
            maxLength={500}
            showCount
          />
        </Modal>
      </div>
    </PublicLayout>
  );
}
