import type { Ad } from "@/lib/types/ad";
import type { BoostType } from "@/lib/types/payment";

/**
 * Prisma возвращает плоскую структуру с полями contactTelegram, viewCount и т.д.
 * Тип Ad ожидает вложенные объекты contacts и metadata.
 * Этот маппер приводит raw-ответ Prisma к типу Ad.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPrismaAdToAd(raw: any): Ad {
  return {
    id: raw.id,
    ownerId: raw.ownerId,
    companyName:
      raw.companyName ??
      raw.owner?.advertiserProfile?.companyName ??
      raw.owner?.advertiserProfile?.displayName ??
      raw.owner?.name ??
      undefined,
    ownerVerified: raw.owner?.advertiserProfile?.verified ?? false,
    title: raw.title,
    description: raw.description,
    platform: raw.platform,
    city: raw.city?.key ?? null,
    category: raw.category?.key ?? null,
    budgetType: raw.budgetType,
    budgetFrom: raw.budgetFrom ?? null,
    budgetTo: raw.budgetTo ?? null,
    budgetDetails: raw.budgetDetails ?? null,
    images: raw.images ?? [],
    contacts: {
      telegram: raw.contactTelegram ?? null,
      whatsapp: raw.contactWhatsapp ?? null,
      phone: raw.contactPhone ?? null,
      email: raw.contactEmail ?? null,
    },
    boosts: Array.isArray(raw.boosts)
      ? raw.boosts.map((b: { boostType: BoostType }) => b.boostType)
      : [],
    publishedAt: raw.publishedAt ? raw.publishedAt.toISOString() : null,
    expiresAt: raw.expiresAt ? raw.expiresAt.toISOString() : null,
    status: raw.status,
    metadata: {
      createdAt: raw.createdAt
        ? raw.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: raw.updatedAt
        ? raw.updatedAt.toISOString()
        : new Date().toISOString(),
      viewCount: raw.viewCount ?? 0,
      contactClickCount: raw.contactClickCount ?? 0,
    },
    // Category dimensions
    videoFormatId: raw.videoFormatId ?? null,
    adFormatId: raw.adFormatId ?? null,
    adSubjectId: raw.adSubjectId ?? null,
    videoFormat: raw.videoFormat ?? null,
    adFormat: raw.adFormat ?? null,
    adSubject: raw.adSubject ?? null,
    // Escrow fields
    paymentMode: raw.paymentMode ?? "direct",
    rpm: raw.rpm ?? null,
    minViews: raw.minViews ?? null,
    maxViewsPerCreator: raw.maxViewsPerCreator ?? null,
    totalBudget: raw.totalBudget ?? null,
    submissionDeadline: raw.submissionDeadline
      ? (typeof raw.submissionDeadline === "string"
          ? raw.submissionDeadline
          : raw.submissionDeadline.toISOString())
      : null,
    escrowAccount: raw.escrowAccount ?? null,
    applicationsCount: raw._count?.applications ?? undefined,
    submissionsCount: raw._count?.submissions ?? undefined,
  };
}
