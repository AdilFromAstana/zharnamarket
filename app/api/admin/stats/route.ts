import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/stats — ключевые метрики платформы
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeAds,
      publishedCreators,
      monthlyRevenueResult,
      totalPromoCodes,
      activePromoCodes,
      recentPayments,
      recentUsers,
      // Escrow stats
      escrowActiveAds,
      escrowTotalVolume,
      pendingSubmissions,
      monthlyPayouts,
      monthlyCommission,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.ad.count({ where: { status: "active" } }),
      prisma.creatorProfile.count({ where: { isPublished: true } }),
      prisma.paymentSession.aggregate({
        where: {
          status: "success",
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.promoCode.count(),
      prisma.promoCode.count({ where: { isActive: true } }),
      prisma.paymentSession.findMany({
        where: { status: "success" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true } },
          ad: { select: { id: true, title: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      // Escrow stats
      prisma.ad.count({ where: { status: "active", paymentMode: "escrow" } }),
      prisma.escrowAccount.aggregate({
        where: { status: "active" },
        _sum: { available: true },
      }),
      prisma.videoSubmission.count({ where: { status: "submitted" } }),
      prisma.videoSubmission.aggregate({
        where: { status: "approved", moderatedAt: { gte: startOfMonth } },
        _sum: { payoutAmount: true },
      }),
      prisma.videoSubmission.aggregate({
        where: { status: "approved", moderatedAt: { gte: startOfMonth } },
        _sum: { commissionAmount: true },
      }),
      prisma.withdrawalRequest.count({ where: { status: "pending" } }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeAds,
      publishedCreators,
      monthlyRevenue: monthlyRevenueResult._sum.amount ?? 0,
      totalPromoCodes,
      activePromoCodes,
      recentPayments,
      recentUsers,
      // Escrow stats
      escrow: {
        activeAds: escrowActiveAds,
        totalVolume: escrowTotalVolume._sum.available ?? 0,
        pendingSubmissions,
        monthlyPayouts: monthlyPayouts._sum.payoutAmount ?? 0,
        monthlyCommission: monthlyCommission._sum.commissionAmount ?? 0,
        pendingWithdrawals,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return serverError();
  }
}
