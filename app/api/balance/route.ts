import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeInt } from "@/lib/validation";

/**
 * GET /api/balance — Кошелёк пользователя + история транзакций.
 * Работает для любого пользователя (креаторы, рекламодатели).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 20));
    const skip = (page - 1) * limit;

    // Получаем или создаём баланс (работает для любого пользователя)
    const balance = await prisma.creatorBalance.upsert({
      where: { userId },
      create: {
        userId,
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        totalTopUp: 0,
        totalSpent: 0,
      },
      update: {},
    });

    // История транзакций (все типы)
    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where: { balanceId: balance.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.balanceTransaction.count({ where: { balanceId: balance.id } }),
    ]);

    return NextResponse.json({
      balance: {
        current: balance.balance,
        totalEarned: balance.totalEarned,
        totalWithdrawn: balance.totalWithdrawn,
        totalTopUp: balance.totalTopUp,
        totalSpent: balance.totalSpent,
      },
      transactions: {
        data: transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error("[GET /api/balance]", err);
    return serverError();
  }
}
