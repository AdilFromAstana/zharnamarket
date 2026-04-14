import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, forbidden, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getCreatorInclude() {
  return {
    platforms: true,
    portfolio: { orderBy: { createdAt: "desc" as const } },
    priceItems: { orderBy: { sortOrder: "asc" as const } },
    boosts: { where: { expiresAt: { gte: new Date() } } },
    user: { select: { id: true, name: true, email: true, avatarColor: true } },
  };
}

/**
 * GET /api/creators/[id]/preview — предпросмотр draft-профиля (только для владельца).
 *
 * Возвращает профиль НЕЗАВИСИМО от isPublished.
 * Требует авторизации + ownership check.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;

    const profile = await prisma.creatorProfile.findUnique({
      where: { id },
      include: getCreatorInclude(),
    });

    if (!profile) return notFound("Профиль не найден");
    if (profile.userId !== userId) return forbidden("Нет доступа к этому профилю");

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[GET /api/creators/[id]/preview]", err);
    return serverError();
  }
}
