import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeInt } from "@/lib/validation";

/**
 * GET /api/admin/submissions — Список подач для модерации.
 * Доступно: только админ.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "admin") return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // submitted, approved, rejected
    const escalated = searchParams.get("escalated"); // true/false
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;
    if (escalated === "true") where.escalated = true;

    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        orderBy: { submittedAt: "asc" }, // FIFO — старые первыми
        skip,
        take: limit,
        include: {
          creator: { select: { id: true, name: true, avatar: true, email: true } },
          ad: {
            select: {
              id: true,
              title: true,
              rpm: true,
              minViews: true,
              maxViewsPerCreator: true,
              description: true,
              images: true,
            },
          },
          appeal: true,
        },
      }),
      prisma.videoSubmission.count({ where }),
    ]);

    return NextResponse.json({
      data: submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/submissions]", err);
    return serverError();
  }
}
