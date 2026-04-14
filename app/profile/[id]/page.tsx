import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

async function fetchProfile(id: string) {
  try {
    // Прямой Prisma запрос — без HTTP-hop к собственному API
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarColor: true,
        createdAt: true,
        advertiserProfile: {
          select: {
            companyName: true,
            displayName: true,
            companyType: true,
            city: true,
            description: true,
            telegram: true,
            whatsapp: true,
            website: true,
            verified: true,
          },
        },
      },
    });

    if (!user) return null;

    // Активные объявления пользователя
    const ads = await prisma.ad.findMany({
      where: {
        ownerId: id,
        status: "active",
        deletedAt: null,
      },
      orderBy: { publishedAt: "desc" },
      include: {
        boosts: {
          where: { expiresAt: { gt: new Date() } },
          select: { boostType: true },
        },
      },
    });

    // Опубликованные анкеты мастера
    const creatorProfiles = await prisma.creatorProfile.findMany({
      where: {
        userId: id,
        isPublished: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fullName: true,
        avatar: true,
        bio: true,
        city: true,
        availability: true,
        verified: true,
        minimumRate: true,
        platforms: true,
        contentCategories: true,
      },
    });

    const profile = user.advertiserProfile;
    const isCompany = !!profile?.companyName;

    return {
      id: user.id,
      displayName:
        profile?.companyName ?? profile?.displayName ?? user.name ?? "Пользователь",
      isCompany,
      companyType: profile?.companyType ?? null,
      city: profile?.city ?? null,
      description: profile?.description ?? null,
      telegram: profile?.telegram ?? null,
      whatsapp: profile?.whatsapp ?? null,
      website: profile?.website ?? null,
      memberSince: user.createdAt.toISOString(),
      verified: profile?.verified ?? false,
      avatarColor: user.avatarColor ?? null,
      ads,
      // Маппим platforms из объектов Prisma в строки — ProfileClient ожидает string[]
      creatorProfiles: creatorProfiles.map((cp) => ({
        ...cp,
        city: cp.city as string,
        availability: cp.availability as string,
        contentCategories: cp.contentCategories as string[],
        platforms: cp.platforms.map((p: { name: string }) => p.name),
      })),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await fetchProfile(id);
  if (!profile) return { title: "Профиль не найден" };

  const description =
    profile.description ||
    `${profile.displayName}${profile.city ? `, ${profile.city}` : ""} — профиль на viral-wall`;

  return {
    title: `${profile.displayName} — viral-wall`,
    description,
    openGraph: {
      title: `${profile.displayName} — viral-wall`,
      description,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await fetchProfile(id);

  if (!profile) {
    notFound();
  }

  return (
    <PublicLayout>
      <ProfileClient profile={profile} />
    </PublicLayout>
  );
}
