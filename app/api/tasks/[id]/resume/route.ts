import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const ad = await prisma.ad.findFirst({ where: { id, deletedAt: null } });
    if (!ad) return notFound("Объявление не найдено");
    if (ad.ownerId !== userId) return forbidden();

    // Нельзя возобновить если срок публикации истёк
    if (ad.expiresAt && ad.expiresAt < new Date()) {
      return badRequest("Срок объявления истёк. Создайте новое объявление или продлите публикацию.");
    }

    const updated = await prisma.ad.update({
      where: { id },
      data: { status: "active" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/ads/[id]/resume]", err);
    return serverError();
  }
}
