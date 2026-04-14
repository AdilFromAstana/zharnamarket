import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/auth";

// GET /api/ad-formats — список активных форматов рекламы
export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get("all") === "true";

    const data = await prisma.adFormat.findMany({
      where: all ? {} : { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        label: true,
        description: true,
        icon: true,
        isActive: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/ad-formats]", err);
    return serverError();
  }
}
