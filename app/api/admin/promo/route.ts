import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  badRequest,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/promo — список всех промокодов
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        _count: { select: { usages: true } },
      },
    });

    return NextResponse.json({ data: promoCodes });
  } catch (err) {
    console.error("[GET /api/admin/promo]", err);
    return serverError();
  }
}

// POST /api/admin/promo — создать промокод
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      expiresAt,
      applicableTo,
    } = body as {
      code?: string;
      discountType?: string;
      discountValue?: number;
      maxUses?: number | null;
      expiresAt?: string | null;
      applicableTo?: string[];
    };

    // Валидация
    if (!code?.trim()) return badRequest("Код промокода обязателен");
    if (!discountType) return badRequest("Тип скидки обязателен");
    if (!["percent", "fixed_amount"].includes(discountType))
      return badRequest("Тип скидки: percent или fixed_amount");
    if (discountValue === undefined || discountValue <= 0)
      return badRequest("Значение скидки должно быть > 0");
    if (discountType === "percent" && discountValue > 100)
      return badRequest("Процент скидки не может быть больше 100");
    if (!applicableTo?.length) return badRequest("Укажите применимость промокода");

    const validTypes = ["ad_publication", "ad_boost", "creator_publication"];
    const invalidTypes = applicableTo.filter((t) => !validTypes.includes(t));
    if (invalidTypes.length)
      return badRequest(`Недопустимые типы: ${invalidTypes.join(", ")}`);

    // Проверяем уникальность кода
    const existing = await prisma.promoCode.findFirst({
      where: { code: { equals: code.trim().toUpperCase(), mode: "insensitive" } },
    });
    if (existing) return badRequest("Промокод с таким кодом уже существует");

    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.trim().toUpperCase(),
        discountType: discountType as "percent" | "fixed_amount",
        discountValue,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicableTo: applicableTo as (
          | "ad_publication"
          | "ad_boost"
          | "creator_publication"
        )[],
        isActive: true,
      },
    });

    return NextResponse.json(promoCode, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/promo]", err);
    return serverError();
  }
}
