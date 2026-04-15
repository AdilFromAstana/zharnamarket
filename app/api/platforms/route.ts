import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/platforms - получить список активных платформ
export async function GET() {
  try {
    const platforms = await prisma.platformRef.findMany({
      where: { isActive: true },
      select: { id: true, key: true, label: true, iconUrl: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(platforms);
  } catch (error) {
    console.error("[GET /api/platforms]", error);
    return NextResponse.json(
      { error: "Не удалось получить платформы" },
      { status: 500 }
    );
  }
}
