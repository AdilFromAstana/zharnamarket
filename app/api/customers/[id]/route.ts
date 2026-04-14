import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/customers/[id] — публичный профиль заказчика (без авторизации)
// id = userId рекламодателя
export async function GET(
  req: NextRequest,
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

    if (!user) return notFound("Заказчик не найден");

    // Получаем активные объявления
    const ads = await prisma.ad.findMany({
      where: {
        ownerId: id,
        status: { in: ["active", "paused"] },
        deletedAt: null,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      include: {
        boosts: {
          where: { expiresAt: { gt: new Date() } },
          select: { boostType: true },
        },
      },
    });

    const profile = user.advertiserProfile;
    const isCompany = !!profile?.companyName;

    return NextResponse.json({
      id: user.id,
      displayName:
        profile?.companyName ?? profile?.displayName ?? user.name ?? "Заказчик",
      isCompany,
      companyType: profile?.companyType ?? null,
      city: profile?.city ?? "",
      description: profile?.description ?? null,
      telegram: profile?.telegram ?? null,
      whatsapp: profile?.whatsapp ?? null,
      website: profile?.website ?? null,
      memberSince: user.createdAt.toISOString(),
      verified: profile?.verified ?? false,
      ads,
    });
  } catch (err) {
    console.error("[GET /api/customers/[id]]", err);
    return serverError();
  }
}
