import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ads — все объявления (включая draft, deleted).
 *
 * Query: search, status, page, limit
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status && status !== "all") {
      if (status === "deleted") {
        where.deletedAt = { not: null };
      } else {
        where.status = status;
        where.deletedAt = null;
      }
    }

    if (search && search.length >= 2) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          platform: true,
          city: true,
          createdAt: true,
          publishedAt: true,
          deletedAt: true,
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.ad.count({ where }),
    ]);

    return NextResponse.json({
      data: ads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/ads]", err);
    return serverError();
  }
}
