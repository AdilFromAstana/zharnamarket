import { NextRequest, NextResponse } from "next/server";
import {
  forbidden,
  getCurrentUserId,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdViewStats } from "@/lib/views";

// GET /api/ads/[id]/view-stats — приватная аналитика просмотров объявления.
// Доступ только владельцу объявления.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const ad = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true },
    });
    if (!ad) return notFound("Объявление не найдено");
    if (ad.ownerId !== userId) return forbidden();

    const stats = await getAdViewStats(id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[GET /api/ads/[id]/view-stats]", err);
    return serverError();
  }
}
