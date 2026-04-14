import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, forbidden, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/creators/[id]/unpublish — снять с публикации
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.creatorProfile.findUnique({ where: { id } });
    if (!existing) return notFound("Профиль не найден");
    if (existing.userId !== userId) return forbidden();

    const profile = await prisma.creatorProfile.update({
      where: { id },
      data: { isPublished: false },
    });

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[POST /api/creators/[id]/unpublish]", err);
    return serverError();
  }
}
