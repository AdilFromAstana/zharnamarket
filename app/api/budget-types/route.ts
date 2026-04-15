import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/budget-types - получить список активных типов бюджета
export async function GET() {
  try {
    const budgetTypes = await prisma.budgetTypeRef.findMany({
      where: { isActive: true },
      select: { id: true, key: true, label: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(budgetTypes);
  } catch (error) {
    console.error("[GET /api/budget-types]", error);
    return NextResponse.json(
      { error: "Не удалось получить типы бюджета" },
      { status: 500 }
    );
  }
}
