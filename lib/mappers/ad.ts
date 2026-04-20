import type { Ad } from "@/lib/types/ad";
import type { BoostType } from "@/lib/types/payment";

const toIso = (v: string | Date | null | undefined): string | null => {
  if (!v) return null;
  return typeof v === "string" ? v : v.toISOString();
};

/**
 * Prisma возвращает плоскую структуру с полями contactTelegram, viewCount и т.д.
 * Тип Ad ожидает вложенные объекты contacts и metadata.
 * Этот маппер приводит raw-ответ Prisma к типу Ad.
 * Безопасен и для серверных объектов (Date), и для сериализованных (ISO-строки).
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
    activeBoostDetails: Array.isArray(raw.boosts)
      ? raw.boosts.map(
          (b: {
            boostType: BoostType;
            activatedAt?: string | Date;
            expiresAt: string | Date;
          }) => ({
            boostType: b.boostType,
            activatedAt: toIso(b.activatedAt) ?? new Date().toISOString(),
            expiresAt: toIso(b.expiresAt) ?? new Date().toISOString(),
          }),
        )
      : [],
    publishedAt: toIso(raw.publishedAt),
    expiresAt: toIso(raw.expiresAt),
    status: raw.status,
    metadata: {
      createdAt: toIso(raw.createdAt) ?? new Date().toISOString(),
      updatedAt: toIso(raw.updatedAt) ?? new Date().toISOString(),
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
    submissionDeadline: toIso(raw.submissionDeadline),
    escrowAccount: raw.escrowAccount ?? null,
    applicationsCount: raw._count?.applications ?? undefined,
    submissionsCount: raw._count?.submissions ?? undefined,
  };
}
