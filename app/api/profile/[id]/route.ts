import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/profile/[id]
 * Публичный профиль пользователя — как на Авито/ОЛХ.
 * Возвращает: базовые данные юзера + его активные объявления (как заказчик)
 * + опубликованные анкеты мастера (как креатор).
 * Авторизация не требуется.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
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

    if (!user) return notFound("Профиль не найден");

    // Активные объявления пользователя (как заказчик)
    const ads = await prisma.ad.findMany({
      where: {
        ownerId: id,
        status: "active",
        deletedAt: null,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
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
      take: 20,
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

    return NextResponse.json({
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
      ads,
      creatorProfiles,
    });
  } catch (err) {
    console.error("[GET /api/profile/[id]]", err);
    return serverError();
  }
}
