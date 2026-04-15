import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordView } from "@/lib/views";

// POST /api/ads/[id]/view — зафиксировать просмотр объявления.
// Dedupe: один IP = один просмотр в 30 минут. Владелец объявления не учитывается.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ad = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, ownerId: true },
    });
    if (!ad) return NextResponse.json({ ok: true, recorded: false });

    const userId = await getCurrentUserId(req);

    const recorded = await recordView(
      { kind: "ad", adId: ad.id },
      { headers: req.headers, userId, ownerUserId: ad.ownerId },
    );

    return NextResponse.json({ ok: true, recorded });
  } catch (err) {
    console.error("[POST /api/ads/[id]/view]", err);
    return serverError();
  }
}
