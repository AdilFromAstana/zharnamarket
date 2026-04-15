import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories - получить список активных категорий
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        key: true,
        label: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return NextResponse.json(
      { error: "Не удалось получить категории" },
      { status: 500 }
    );
  }
}