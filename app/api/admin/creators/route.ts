import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/creators — все профили креаторов (включая unpublished).
 *
 * Query: search, published, verified, page, limit
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const published = searchParams.get("published");
    const verified = searchParams.get("verified");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (published === "true") where.isPublished = true;
    else if (published === "false") where.isPublished = false;

    if (verified === "true") where.verified = true;
    else if (verified === "false") where.verified = false;

    if (search && search.length >= 2) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          fullName: true,
          city: true,
          isPublished: true,
          verified: true,
          featured: true,
          verificationStatus: true,
          verificationRequestedAt: true,
          createdAt: true,
          publishedAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);

    return NextResponse.json({
      data: creators,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/creators]", err);
    return serverError();
  }
}
