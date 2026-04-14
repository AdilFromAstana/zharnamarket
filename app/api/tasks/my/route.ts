import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/ads/my — мои объявления (авторизован)
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // all | active | paused | expired

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      ownerId: userId,
      deletedAt: null,
    };

    const VALID_STATUSES = new Set(["active", "paused", "expired", "draft", "pending_payment"]);
    if (status && status !== "all") {
      if (status === "expired") {
        where.status = { in: ["expired", "archived"] };
      } else if (VALID_STATUSES.has(status)) {
        where.status = status;
      }
      // Invalid status values are silently ignored (shows all)
    }

    const ads = await prisma.ad.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        boosts: {
          where: { expiresAt: { gt: new Date() } },
          select: { boostType: true, expiresAt: true },
        },
      },
    });

    return NextResponse.json(ads);
  } catch (err) {
    console.error("[GET /api/ads/my]", err);
    return serverError();
  }
}
