import type { CreatorProfile } from "@/lib/types/creator";
import type { BoostType } from "@/lib/types/payment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCreatorFromApi(c: any): CreatorProfile {
  return {
    id: c.id,
    userId: c.userId,
    title: c.title,
    isPublished: c.isPublished,
    fullName: c.fullName,
    username: c.username ?? null,
    avatar: c.avatar ?? null,
    bio: c.bio ?? null,
    city: typeof c.city === "string" ? c.city : (c.city?.key ?? null),
    age: c.age ?? null,
    availability: c.availability,
    verified: c.verified ?? false,
    platforms: c.platforms ?? [],
    contentCategories: Array.isArray(c.categories)
      ? c.categories.map((cat: { key: string }) => cat.key)
      : (c.contentCategories ?? []),
    portfolio: c.portfolio ?? [],
    pricing: {
      minimumRate: c.minimumRate ?? c.pricing?.minimumRate ?? 0,
      negotiable: c.negotiable ?? c.pricing?.negotiable ?? false,
      currency: c.currency ?? c.pricing?.currency ?? "KZT",
      items: (c.priceItems ?? c.pricing?.items ?? []).map(
        (item: { label: string; price: number }) => ({
          label: item.label,
          price: item.price,
        }),
      ),
    },
    contacts: {
      telegram: c.contactTelegram ?? c.contacts?.telegram ?? null,
      whatsapp: c.contactWhatsapp ?? c.contacts?.whatsapp ?? null,
      phone: c.contactPhone ?? c.contacts?.phone ?? null,
      email: c.contactEmail ?? c.contacts?.email ?? null,
    },
    metadata: {
      createdAt: c.createdAt ?? c.metadata?.createdAt,
      updatedAt: c.updatedAt ?? c.metadata?.updatedAt,
      lastActiveAt: c.lastActiveAt ?? c.metadata?.lastActiveAt,
    },
    screenshots: c.screenshots ?? [],
    averageRating: c.averageRating ?? 0,
    reviewCount: c.reviewCount ?? 0,
    contactClickCount: c.contactClickCount ?? 0,
    stats: c.stats ?? undefined,
    avatarColor: c.user?.avatarColor ?? c.avatarColor ?? null,
    boosts: Array.isArray(c.boosts)
      ? c.boosts.map((b: { boostType: BoostType }) => b.boostType)
      : [],
  };
}
