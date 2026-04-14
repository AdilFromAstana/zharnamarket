import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reviews/my — отзывы текущего пользователя
// written — отзывы, которые я написал
// received — отзывы на мои профили креаторов
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    // Параллельный запрос: отзывы написанные мной + отзывы на мои профили
    const [written, myProfiles] = await Promise.all([
      prisma.review.findMany({
        where: { reviewerId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          creatorProfile: {
            select: { id: true, title: true, fullName: true, avatar: true },
          },
        },
      }),
      prisma.creatorProfile.findMany({
        where: { userId },
        select: { id: true },
      }),
    ]);

    const myProfileIds = myProfiles.map((p) => p.id);

    const received =
      myProfileIds.length > 0
        ? await prisma.review.findMany({
            where: {
              targetType: "creator_profile",
              targetId: { in: myProfileIds },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
              reviewer: {
                select: { id: true, name: true, avatar: true, avatarColor: true },
              },
              creatorProfile: {
                select: { id: true, title: true, fullName: true },
              },
            },
          })
        : [];

    return NextResponse.json({ written, received });
  } catch (err) {
    console.error("[GET /api/reviews/my]", err);
    return serverError();
  }
}
