import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/auth";

const PUBLIC_VIEW_THRESHOLD = 20;

// GET /api/ads/[id]/view-stats/public — публичное число просмотров объявления
// за последние 30 дней. Ниже порога — last30Days = null.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ad = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!ad) {
      return NextResponse.json({ last30Days: null });
    }

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await prisma.adView.count({
      where: { adId: id, createdAt: { gte: since30 } },
    });

    return NextResponse.json({
      last30Days: count >= PUBLIC_VIEW_THRESHOLD ? count : null,
    });
  } catch (err) {
    console.error("[GET /api/ads/[id]/view-stats/public]", err);
    return serverError();
  }
}
