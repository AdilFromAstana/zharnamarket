import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users — список пользователей с поиском и фильтрами.
 *
 * Query params:
 *   search — поиск по name/email (case-insensitive)
 *   role   — "user" | "admin" | отсутствует (все)
 *   blocked — "true" | "false" | отсутствует (все)
 *   page   — номер страницы (default 1)
 *   limit  — элементов на страницу (default 20, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role");
    const blockedParam = searchParams.get("blocked");
    const deletedParam = searchParams.get("deleted");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search && search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role === "user" || role === "admin") {
      where.role = role;
    }

    if (blockedParam === "true") where.blocked = true;
    else if (blockedParam === "false") where.blocked = false;

    if (deletedParam === "true") where.isDeleted = true;
    else if (deletedParam === "false") where.isDeleted = false;
    else where.isDeleted = false; // по умолчанию не показываем удалённых

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          emailVerified: true,
          blocked: true,
          blockedAt: true,
          isDeleted: true,
          createdAt: true,
          _count: {
            select: {
              ads: true,
              creatorProfiles: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return serverError();
  }
}
