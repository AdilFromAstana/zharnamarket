import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/auth";

// Минимальный порог показа: если за 30 дней <20 просмотров — публично не показываем,
// чтобы новичков с «3 просмотра» не позорить и не давать слабый social proof.
const PUBLIC_VIEW_THRESHOLD = 20;

// GET /api/creators/[id]/view-stats/public — публичное число просмотров профиля
// за последние 30 дней. Возвращает только одно число без разбивки по дням.
// Если меньше порога — last30Days = null (UI прячет блок).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const profile = await prisma.creatorProfile.findFirst({
      where: { id, isPublished: true },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ last30Days: null });
    }

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await prisma.profileView.count({
      where: { creatorProfileId: id, createdAt: { gte: since30 } },
    });

    return NextResponse.json({
      last30Days: count >= PUBLIC_VIEW_THRESHOLD ? count : null,
    });
  } catch (err) {
    console.error("[GET /api/creators/[id]/view-stats/public]", err);
    return serverError();
  }
}
