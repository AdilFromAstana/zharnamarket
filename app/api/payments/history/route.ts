import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/payments/history — история платежей текущего пользователя
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const payments = await prisma.paymentSession.findMany({
      where: { userId, status: "success" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        originalAmount: true,
        discountAmount: true,
        method: true,
        status: true,
        boostType: true,
        createdAt: true,
        promoCode: {
          select: { code: true, discountType: true, discountValue: true },
        },
        ad: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({ data: payments });
  } catch (err) {
    console.error("[GET /api/payments/history]", err);
    return serverError();
  }
}
