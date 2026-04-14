"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Divider, Alert, Dropdown, Spin } from "antd";
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  ShareAltOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  TagsOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import ContactButton from "@/components/ui/ContactButton";
import type { Ad } from "@/lib/types/ad";
import type {
  ApprovedSubmission,
  TaskApplication,
} from "@/lib/types/submission";
import { formatDate, formatRelative, formatBudgetShort } from "@/lib/utils";
import {
  PLATFORM_BADGE_CLASSES,
  AD_STATUS_LABELS,
  BUDGET_TYPE_LABELS,
} from "@/lib/constants";
import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import ContactModal from "./ContactModal";
import AdPhotoGallery from "./AdPhotoGallery";
import EscrowBudgetSection from "./EscrowBudgetSection";
import ApprovedVideosList from "./ApprovedVideosList";
import RichTextContent from "@/components/ui/RichTextContent";
import ReportModal from "@/components/report/ReportModal";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api-client";

import TabButton from "./TabButton";
import EscrowApplyButton from "./EscrowApplyButton";
import AdSidebar from "./AdSidebar";
import AdRelatedSection from "./AdRelatedSection";
import AdMobileStickyBar from "./AdMobileStickyBar";

type TabKey = "task" | "videos";

interface AdDetailClientProps {
  ad: Ad;
  relatedAds: Ad[];
  approvedSubmissions: ApprovedSubmission[];
  totalApprovedViews: number;
}

export default function AdDetailClient({
  ad,
  relatedAds,
  approvedSubmissions,
  totalApprovedViews,
}: AdDetailClientProps) {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();

  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("task");

  // ── Escrow application state ─────────────────────────────────
  const [userApplication, setUserApplication] =
    useState<TaskApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoUrlSubmitting, setVideoUrlSubmitting] = useState(false);

  const isEscrow = ad.paymentMode === "escrow";
  const statusLabel = AD_STATUS_LABELS[ad.status];
  const isActive = ad.status === "active";
  const isOwner = !!user && user.id === ad.ownerId;

  const displayName =
    ad.companyName ||
    (ad.contacts.telegram
      ? ad.contacts.telegram.replace("@", "").replace(/_/g, " ")
      : null) ||
    "Рекламодатель";

  // ── Fetch application status for escrow ads ──────────────────
  const fetchApplication = useCallback(async () => {
    if (!isEscrow || !isLoggedIn || isOwner) return;
    setApplicationLoading(true);
    try {
      const res = await api.get<{ application: TaskApplication | null }>(
        `/api/tasks/${ad.id}/apply`,
      );
      setUserApplication(res.application);
    } catch {
      // non-fatal
    } finally {
      setApplicationLoading(false);
    }
  }, [ad.id, isEscrow, isLoggedIn, isOwner]);

  useEffect(() => {
    if (!authLoading) fetchApplication();
  }, [authLoading, fetchApplication]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleApply = async () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    setApplying(true);
    try {
      const result = await api.post<TaskApplication>(
        `/api/tasks/${ad.id}/apply`,
        {},
      );
      setUserApplication(result);
      toast.success(
        "Заявка отправлена! У вас 48 часов, чтобы прикрепить ссылку на видео.",
      );
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка при отклике");
    } finally {
      setApplying(false);
    }
  };

  const handleSubmitVideoUrl = async () => {
    if (!videoUrlInput.trim()) {
      toast.error("Введите ссылку на видео");
      return;
    }
    setVideoUrlSubmitting(true);
    try {
      const result = await api.post<TaskApplication>(
        `/api/tasks/${ad.id}/apply/video`,
        { videoUrl: videoUrlInput.trim() },
      );
      setUserApplication((prev) => (prev ? { ...prev, ...result } : result));
      toast.success(
        "Видео прикреплено! Заказчик проверит его в течение 72 часов.",
      );
      setVideoUrlInput("");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка при прикреплении видео");
    } finally {
      setVideoUrlSubmitting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Ссылка скопирована");
  };

  // ── Dropdown menu items ───────────────────────────────────────
  const dropdownItems = [
    { key: "copy", label: "Скопировать ссылку", onClick: handleShare },
    ...(isOwner && isEscrow
      ? [
          {
            key: "applications",
            label: "Заявки на задание",
            icon: <TeamOutlined />,
            onClick: () => router.push(`/ads/${ad.id}/applications`),
          },
        ]
      : []),
    {
      key: "report",
      label: "Пожаловаться",
      danger: true,
      onClick: () => setReportOpen(true),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-10 flex flex-col gap-4">
      {!isActive && (
        <Alert
          type="warning"
          title={`Объявление: ${statusLabel}`}
          description="Это объявление может быть неактуальным."
          showIcon
        />
      )}

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ───── LEFT COLUMN (main content) ───── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-8">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 text-sm sm:text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeftOutlined className="text-sm sm:text-[10px]" />
                <span className="sm:hidden">Назад</span>
                <span className="hidden sm:inline">Объявления</span>
              </button>
              <Dropdown
                menu={{ items: dropdownItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <button
                  type="button"
                  className="p-2.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                >
                  <MoreOutlined className="text-base" />
                </button>
              </Dropdown>
            </div>

            {/* Title + meta */}
            <div className="mb-4">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
                {ad.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <EnvironmentOutlined />
                  {ENUM_TO_CITY[ad.city] ?? ad.city}
                </span>
                <span className="flex items-center gap-1">
                  <ClockCircleOutlined />
                  {formatRelative(ad.publishedAt)}
                </span>
              </div>
            </div>

            {/* Tag strip */}
            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              <span
                className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${PLATFORM_BADGE_CLASSES[ad.platform] ?? "bg-gray-800 text-white"}`}
              >
                {ad.platform}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                <VideoCameraOutlined className="text-[10px]" />
                {ad.videoFormat?.label ??
                  ENUM_TO_CATEGORY[ad.category] ??
                  ad.category}
              </span>
              {ad.adFormat && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-violet-50 border-violet-200 text-violet-700">
                  <ThunderboltOutlined className="text-[10px]" />
                  {ad.adFormat.label}
                </span>
              )}
              {ad.adSubject && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                  <TagsOutlined className="text-[10px]" />
                  {ad.adSubject.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                {ad.paymentMode === "escrow" ? (
                  <ThunderboltOutlined className="text-[10px]" />
                ) : (
                  <TeamOutlined className="text-[10px]" />
                )}
                {ad.paymentMode === "escrow"
                  ? "Через платформу"
                  : "Через заказчика"}
              </span>
            </div>

            <Divider className="my-4" />

            {/* Budget section */}
            {isEscrow ? (
              <EscrowBudgetSection
                escrowAccount={ad.escrowAccount}
                rpm={ad.rpm ?? null}
                platform={ad.platform}
                submissionDeadline={ad.submissionDeadline ?? null}
                approvedCount={approvedSubmissions.length}
                totalApprovedViews={totalApprovedViews}
              />
            ) : (
              <div className="mb-5">
                <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-xl shadow-slate-100">
                  <p className="text-slate-400 text-[10px] font-medium mb-2 uppercase tracking-widest">
                    Бюджет проекта
                  </p>
                  <div className="text-2xl font-bold tracking-tight leading-tight mb-1">
                    {formatBudgetShort(
                      ad.budgetType,
                      ad.budgetFrom,
                      ad.budgetTo,
                      ad.budgetDetails,
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    {BUDGET_TYPE_LABELS[ad.budgetType]}
                  </div>
                  {ad.budgetDetails && (
                    <p className="text-slate-300 text-xs leading-relaxed border-t border-slate-700 pt-3">
                      {ad.budgetDetails}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tabs (escrow only) */}
            {isEscrow && (
              <div className="flex gap-0 border-b border-gray-200 mb-5 -mx-px">
                <TabButton
                  active={activeTab === "task"}
                  onClick={() => setActiveTab("task")}
                >
                  Задача
                </TabButton>
                <TabButton
                  active={activeTab === "videos"}
                  onClick={() => setActiveTab("videos")}
                  badge={
                    approvedSubmissions.length > 0
                      ? approvedSubmissions.length
                      : undefined
                  }
                >
                  <PlayCircleOutlined className="mr-1" />
                  Видео
                </TabButton>
              </div>
            )}

            {/* Tab content */}
            {isEscrow && activeTab === "videos" ? (
              <ApprovedVideosList submissions={approvedSubmissions} />
            ) : (
              <>
                {/* Description */}
                <div className="mb-5">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                    Описание
                  </h2>
                  {ad.description.includes("<") ? (
                    <RichTextContent html={ad.description} />
                  ) : (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                      {ad.description}
                    </p>
                  )}
                </div>

                {/* Photo gallery */}
                {ad.images && ad.images.length > 0 && (
                  <AdPhotoGallery images={ad.images} title={ad.title} />
                )}

                <Divider className="hidden md:block my-4" />

                {/* Desktop CTA */}
                <div className="hidden md:flex items-center gap-4">
                  {isActive ? (
                    <>
                      {isEscrow ? (
                        <EscrowApplyButton
                          adId={ad.id}
                          application={userApplication}
                          loading={applicationLoading || authLoading}
                          applying={applying}
                          isLoggedIn={isLoggedIn}
                          isOwner={isOwner}
                          onApply={handleApply}
                        />
                      ) : (
                        <ContactButton onClick={() => setContactOpen(true)} />
                      )}
                      <Button
                        type="text"
                        icon={<ShareAltOutlined />}
                        onClick={handleShare}
                      >
                        Поделиться
                      </Button>
                    </>
                  ) : (
                    <div>
                      <p className="text-gray-500 mb-3 text-sm">
                        Это объявление больше неактивно
                      </p>
                      <Link href="/ads">
                        <Button size="large">Смотреть другие объявления</Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm text-gray-400">
                  {ad.metadata.viewCount > 0 && (
                    <span className="flex items-center gap-1">
                      <EyeOutlined />
                      {ad.metadata.viewCount} просмотров
                    </span>
                  )}
                  {ad.metadata.contactClickCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageOutlined />
                      {ad.metadata.contactClickCount} обращений
                    </span>
                  )}
                  {ad.publishedAt && (
                    <span>Опубликовано: {formatDate(ad.publishedAt)}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ───── RIGHT COLUMN (sidebar) ───── */}
        <AdSidebar
          ad={ad}
          isActive={isActive}
          isEscrow={isEscrow}
          isOwner={isOwner}
          isLoggedIn={isLoggedIn}
          displayName={displayName}
          userApplication={userApplication}
          applicationLoading={applicationLoading || authLoading}
          applying={applying}
          videoUrlInput={videoUrlInput}
          videoUrlSubmitting={videoUrlSubmitting}
          onContactOpen={() => setContactOpen(true)}
          onApply={handleApply}
          onVideoUrlChange={setVideoUrlInput}
          onSubmitVideoUrl={handleSubmitVideoUrl}
          onShare={handleShare}
        />
      </div>

      {/* Mobile sticky CTA */}
      {isActive && (
        <AdMobileStickyBar
          adId={ad.id}
          isEscrow={isEscrow}
          isOwner={isOwner}
          userApplication={userApplication}
          applicationLoading={applicationLoading || authLoading}
          applying={applying}
          onContactOpen={() => setContactOpen(true)}
          onApply={handleApply}
        />
      )}

      {/* Related ads */}
      <AdRelatedSection ad={ad} relatedAds={relatedAds} />

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        contacts={ad.contacts}
      />

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="ad"
        targetId={ad.id}
      />
    </div>
  );
}
