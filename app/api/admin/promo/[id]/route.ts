import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  badRequest,
  notFound,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/promo/[id] — редактировать промокод (деактивировать, изменить лимиты и т.д.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();

    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) return notFound("Промокод не найден");

    const allowedFields = [
      "isActive",
      "maxUses",
      "expiresAt",
      "discountValue",
      "discountType",
      "applicableTo",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "expiresAt") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === "discountType") {
          if (!["percent", "fixed_amount"].includes(body[field])) {
            return badRequest("Тип скидки: percent или fixed_amount");
          }
          updateData[field] = body[field];
        } else if (field === "discountValue") {
          if (typeof body[field] !== "number" || body[field] <= 0) {
            return badRequest("Значение скидки должно быть > 0");
          }
          updateData[field] = body[field];
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest("Нет полей для обновления");
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/promo/[id]]", err);
    return serverError();
  }
}

// GET /api/admin/promo/[id] — детали промокода с историей использований
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const promo = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            payment: { select: { id: true, type: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!promo) return notFound("Промокод не найден");

    return NextResponse.json(promo);
  } catch (err) {
    console.error("[GET /api/admin/promo/[id]]", err);
    return serverError();
  }
}
