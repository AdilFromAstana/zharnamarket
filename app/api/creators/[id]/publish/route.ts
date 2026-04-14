import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, forbidden, notFound, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/creators/[id]/publish — бесплатная публикация профиля
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
    if (existing.isPublished) return badRequest("Профиль уже опубликован");

    const profile = await prisma.creatorProfile.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date(), raisedAt: new Date() },
    });

    return NextResponse.json({ status: "published", profileId: profile.id });
  } catch (err) {
    console.error("[POST /api/creators/[id]/publish]", err);
    return serverError();
  }
}
