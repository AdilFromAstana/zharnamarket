import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordView } from "@/lib/views";

// POST /api/creators/[id]/view — зафиксировать просмотр профиля.
// Dedupe: один IP = один просмотр в 30 минут. Владелец профиля не учитывается.
// Ответ всегда 200, recorded: boolean — чтобы не раскрывать эвристики клиенту.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const profile = await prisma.creatorProfile.findFirst({
      where: { id, isPublished: true },
      select: { id: true, userId: true },
    });
    if (!profile) return NextResponse.json({ ok: true, recorded: false });

    const userId = await getCurrentUserId(req);

    const recorded = await recordView(
      { kind: "profile", creatorProfileId: profile.id },
      { headers: req.headers, userId, ownerUserId: profile.userId },
    );

    return NextResponse.json({ ok: true, recorded });
  } catch (err) {
    console.error("[POST /api/creators/[id]/view]", err);
    return serverError();
  }
}
