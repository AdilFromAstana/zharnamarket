import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, forbidden, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/creators/[id]/request-verification — подать заявку на верификацию.
 *
 * Требования:
 * - Профиль должен быть опубликован
 * - Текущий статус: "none" или "rejected" (можно подать повторно)
 * - Пользователь — владелец профиля
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;

    const profile = await prisma.creatorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isPublished: true,
        verified: true,
        verificationStatus: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
    }
    if (profile.userId !== userId) return forbidden();

    if (!profile.isPublished) {
      return NextResponse.json(
        { error: "Профиль должен быть опубликован для подачи заявки" },
        { status: 400 },
      );
    }

    if (profile.verified) {
      return NextResponse.json(
        { error: "Профиль уже верифицирован" },
        { status: 400 },
      );
    }

    if (profile.verificationStatus === "pending") {
      return NextResponse.json(
        { error: "Заявка уже подана и ожидает рассмотрения" },
        { status: 400 },
      );
    }

    const updated = await prisma.creatorProfile.update({
      where: { id },
      data: {
        verificationStatus: "pending",
        verificationRequestedAt: new Date(),
        verificationNote: null,
      },
      select: {
        id: true,
        verificationStatus: true,
        verificationRequestedAt: true,
      },
    });

    return NextResponse.json({
      ...updated,
      message: "Заявка на верификацию подана",
    });
  } catch (err) {
    console.error("[POST /api/creators/[id]/request-verification]", err);
    return serverError();
  }
}
