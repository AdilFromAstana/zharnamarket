import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/creators/[id] — модерация профиля креатора.
 *
 * Body: { verified?: boolean, featured?: boolean, isPublished?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { verified, featured, isPublished } = body as {
      verified?: boolean;
      featured?: boolean;
      isPublished?: boolean;
    };

    const existing = await prisma.creatorProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof verified === "boolean") {
      data.verified = verified;
      data.verificationStatus = verified ? "approved" : "rejected";
      data.verificationNote = null;
    }
    if (typeof featured === "boolean") data.featured = featured;
    if (typeof isPublished === "boolean") {
      data.isPublished = isPublished;
      if (isPublished && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("Нет полей для обновления");
    }

    const updated = await prisma.creatorProfile.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        isPublished: true,
        verified: true,
        featured: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/creators/[id]]", err);
    return serverError();
  }
}
