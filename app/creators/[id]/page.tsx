import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import CreatorDetailClient from "./CreatorDetailClient";
import OtherCreatorProfiles from "./OtherCreatorProfiles";
import JsonLd, { creatorProfileSchema, breadcrumbSchema } from "@/components/seo/JsonLd";
import { prisma } from "@/lib/prisma";

interface CreatorPageProps {
  params: Promise<{ id: string }>;
}

async function fetchCreator(id: string) {
  try {
    // Прямой Prisma запрос — без HTTP-hop к собственному API
    const raw = await prisma.creatorProfile.findFirst({
      where: { id, isPublished: true },
      include: {
        platforms: true,
        portfolio: { orderBy: { createdAt: "desc" } },
        priceItems: { orderBy: { sortOrder: "asc" } },
        boosts: { where: { expiresAt: { gte: new Date() } } },
        user: { select: { avatarColor: true } },
      },
    });
    if (!raw) return null;

    // Агрегация escrow-статистики по VideoSubmission
    const [approvedCount, decidedCount] = await Promise.all([
      prisma.videoSubmission.count({
        where: { creatorId: raw.userId, status: "approved" },
      }),
      prisma.videoSubmission.count({
        where: {
          creatorId: raw.userId,
          status: { in: ["approved", "rejected", "rejected_system"] },
        },
      }),
    ]);

    const stats =
      approvedCount > 0
        ? {
            completedOrders: approvedCount,
            successRate:
              decidedCount > 0
                ? Math.round((approvedCount / decidedCount) * 100)
                : null,
          }
        : undefined;

    return mapCreatorFromApi({ ...raw, stats });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: CreatorPageProps) {
  const { id } = await params;
  const creator = await fetchCreator(id);
  if (!creator) return { title: "Профиль не найден" };
  const platformNames = creator.platforms?.map((p: { name: string }) => p.name) ?? [];
  const keywords = [
    creator.fullName,
    creator.city || "Казахстан",
    ...platformNames,
    "креатор",
    "блогер",
    "видеоконтент",
    "контент жасаушы",
  ].filter(Boolean);

  const bio = creator.bio || `${creator.fullName}, ${creator.city}`;
  const desc = bio.length > 155 ? bio.slice(0, 155) + "…" : bio;

  return {
    title: `${creator.fullName} — Zharnamarket`,
    description: desc,
    keywords,
    openGraph: {
      title: `${creator.fullName} — Zharnamarket`,
      description: desc,
      type: "profile",
      url: `https://zharnamarket.kz/creators/${id}`,
    },
    alternates: {
      canonical: `/creators/${id}`,
    },
  };
}

async function fetchOtherProfiles(userId: string, currentId: string) {
  const raw = await prisma.creatorProfile.findMany({
    where: {
      userId,
      isPublished: true,
      id: { not: currentId },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      fullName: true,
      avatar: true,
      city: { select: { label: true } },
      user: { select: { avatarColor: true } },
    },
  });
  return raw.map((p) => ({
    id: p.id,
    title: p.title,
    fullName: p.fullName,
    city: p.city?.label ?? "",
    avatar: p.avatar,
    avatarColor: p.user?.avatarColor ?? null,
  }));
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { id } = await params;
  const creator = await fetchCreator(id);

  if (!creator) {
    notFound();
  }

  const otherProfiles = await fetchOtherProfiles(creator.userId, creator.id);

  return (
    <PublicLayout>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Главная", url: "https://zharnamarket.kz" },
            { name: "Каталог креаторов", url: "https://zharnamarket.kz/creators" },
            { name: creator.fullName, url: `https://zharnamarket.kz/creators/${creator.id}` },
          ]),
          creatorProfileSchema({
            id: creator.id,
            fullName: creator.fullName,
            bio: creator.bio,
            city: creator.city,
            platforms: creator.platforms.map((p) => p.name),
            avatar: creator.avatar,
            rating: creator.averageRating,
            reviewCount: creator.reviewCount,
          }),
        ]}
      />
      <CreatorDetailClient creator={creator} />
      {otherProfiles.length > 0 && (
        <div className="max-w-6xl mx-auto mt-8">
          <OtherCreatorProfiles profiles={otherProfiles} />
        </div>
      )}
    </PublicLayout>
  );
}
