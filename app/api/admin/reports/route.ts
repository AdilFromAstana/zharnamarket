import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/reports — список жалоб с фильтрами и пагинацией.
 *
 * Query params:
 *   resolved  — "true" | "false" | отсутствует (все)
 *   targetType — "ad" | "creator" | "customer" | "review" | отсутствует (все)
 *   page      — номер страницы (default 1)
 *   limit     — элементов на страницу (default 20, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const resolvedParam = searchParams.get("resolved");
    const targetType = searchParams.get("targetType");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (resolvedParam === "true") where.resolved = true;
    else if (resolvedParam === "false") where.resolved = false;

    if (targetType && ["ad", "creator", "customer", "review"].includes(targetType)) {
      where.targetType = targetType;
    }

    const [reports, total, unresolvedCount] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          submitter: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
      prisma.report.count({ where }),
      prisma.report.count({ where: { resolved: false } }),
    ]);

    return NextResponse.json({
      data: reports,
      unresolvedCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/reports]", err);
    return serverError();
  }
}
