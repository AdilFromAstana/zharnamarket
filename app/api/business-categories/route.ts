import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/business-categories - получить список активных бизнес-категорий
export async function GET() {
  try {
    const businessCategories = await prisma.businessCategory.findMany({
      where: { isActive: true },
      select: { id: true, key: true, label: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(businessCategories);
  } catch (error) {
    console.error("[GET /api/business-categories]", error);
    return NextResponse.json(
      { error: "Не удалось получить бизнес-категории" },
      { status: 500 }
    );
  }
}
