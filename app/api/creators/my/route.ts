import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/creators/my — профили текущего пользователя
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const profiles = await prisma.creatorProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        platforms: true,
        portfolio: { orderBy: { createdAt: "desc" } },
        priceItems: { orderBy: { sortOrder: "asc" } },
        boosts: { where: { expiresAt: { gte: new Date() } } },
      },
    });

    return NextResponse.json(profiles);
  } catch (err) {
    console.error("[GET /api/creators/my]", err);
    return serverError();
  }
}
