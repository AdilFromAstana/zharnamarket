import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getRequestIP } from "@/lib/rate-limit";

// Rate limit: 5 кликов с одного IP в минуту
const limiter = createRateLimiter(5, 60 * 1000);

// POST /api/ads/[id]/contact-click — зафиксировать клик по контактам (публичный)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getRequestIP(req.headers);
    if (!limiter.check(ip)) {
      return NextResponse.json({ ok: true }); // Молча игнорируем (не раскрываем rate limit)
    }

    const { id } = await params;
    await prisma.ad.updateMany({
      where: { id, deletedAt: null },
      data: { contactClickCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/ads/[id]/contact-click]", err);
    return serverError();
  }
}
