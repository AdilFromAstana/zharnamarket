export type SubmissionStatus = "submitted" | "approved" | "rejected" | "rejected_system";

export type ContentStatus =
  | "pending_video"
  | "video_timed_out"
  | "pending_review"
  | "content_approved"
  | "content_rejected";

export type RejectionReason =
  | "no_brand"
  | "no_banner"
  | "fake_stats"
  | "boosted_views"
  | "wrong_hashtags"
  | "video_unavailable"
  | "other";

export type EscrowStatus = "active" | "exhausted" | "refunded" | "cancelled";

export type PaymentMode = "direct" | "escrow";

export interface EscrowAccount {
  id: string;
  adId: string;
  initialAmount: number;
  spentAmount: number;
  reservedAmount: number;
  available: number;
  status: EscrowStatus;
}

export interface TaskApplicationSubmission {
  id: string;
  status: SubmissionStatus;
  claimedViews: number;
  approvedViews: number | null;
  rejectionReason: RejectionReason | null;
  reservedAmount: number | null;
  payoutAmount: number | null;
  submittedAt: string;
}

export interface TaskApplication {
  id: string;
  adId: string;
  creatorId: string;
  createdAt: string;
  // Новые поля флоу одобрения контента
  contentStatus: ContentStatus;
  videoDeadline: string | null;
  videoUrl: string | null;
  videoSubmittedAt: string | null;
  contentReviewDeadline: string | null;
  contentReviewedAt: string | null;
  contentRejectionNote: string | null;
  creator?: {
    id: string;
    name: string;
    avatar: string | null;
    creatorProfiles?: { id: string; bio: string | null; platforms: string[] }[];
  };
  submission?: TaskApplicationSubmission | null;
}

export interface VideoSubmission {
  id: string;
  applicationId: string;
  adId: string;
  creatorId: string;
  videoUrl: string;
  screenshotUrl: string;
  claimedViews: number;
  approvedViews: number | null;
  rejectionReason: RejectionReason | null;
  rejectionComment: string | null;
  moderatorId: string | null;
  moderatedAt: string | null;
  reservedAmount: number | null;
  payoutAmount: number | null;
  commissionAmount: number | null;
  grossAmount: number | null;
  status: SubmissionStatus;
  submittedAt: string;
  slaDeadline: string;
  escalated: boolean;
  creator?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  ad?: {
    id: string;
    title: string;
    rpm: number | null;
  };
  appeal?: Appeal | null;
}

export interface Appeal {
  id: string;
  submissionId: string;
  creatorId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewComment: string | null;
  deadline: string;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * Публичные данные одобренной подачи для отображения на странице задания.
 * Загружается server-side в page.tsx.
 */
export interface ApprovedSubmission {
  id: string;
  videoUrl: string;
  screenshotUrl: string;
  approvedViews: number | null;
  payoutAmount: number | null; // выплачено креатору (= «Потрачено»)
  moderatedAt: string | null;
}

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  no_brand: "Бренд/продукт не виден в видео",
  no_banner: "Баннер отсутствует или замазан",
  fake_stats: "Подозрение на поддельный скриншот",
  boosted_views: "Признаки накрутки просмотров",
  wrong_hashtags: "Нет обязательных хэштегов/ссылок",
  video_unavailable: "Видео удалено или стало приватным",
  other: "Другое",
};

/** Reasons that permanently block re-submission of the same video */
export const PERMANENT_REJECTION_REASONS: RejectionReason[] = [
  "fake_stats",
  "boosted_views",
];
