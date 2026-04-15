import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cities - получить список активных городов
export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      select: {
        id: true,
        key: true,
        label: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error("[GET /api/cities]", error);
    return NextResponse.json(
      { error: "Не удалось получить города" },
      { status: 500 }
    );
  }
}