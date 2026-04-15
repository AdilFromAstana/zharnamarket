import { NextRequest, NextResponse } from "next/server";
import {
  forbidden,
  getCurrentUserId,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfileViewStats } from "@/lib/views";

// GET /api/creators/[id]/view-stats — приватная аналитика просмотров профиля.
// Доступ только владельцу (и, опционально, админу в будущем).
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
      select: { userId: true },
    });
    if (!profile) return notFound("Профиль не найден");
    if (profile.userId !== userId) return forbidden();

    const stats = await getProfileViewStats(id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[GET /api/creators/[id]/view-stats]", err);
    return serverError();
  }
}
