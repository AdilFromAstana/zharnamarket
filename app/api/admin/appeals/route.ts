import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeInt } from "@/lib/validation";

/**
 * GET /api/admin/appeals — Список апелляций для рассмотрения.
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
    const status = searchParams.get("status") ?? "pending";
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 20));
    const skip = (page - 1) * limit;

    const where = { status };

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          submission: {
            include: {
              ad: { select: { id: true, title: true, rpm: true } },
            },
          },
        },
      }),
      prisma.appeal.count({ where }),
    ]);

    return NextResponse.json({
      data: appeals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/appeals]", err);
    return serverError();
  }
}
