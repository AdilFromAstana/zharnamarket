import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeInt } from "@/lib/validation";

/**
 * GET /api/submissions/my — Мои подачи (для креатора).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { creatorId: userId };
    if (status) where.status = status;

    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              rpm: true,
              platform: true,
            },
          },
          appeal: true,
        },
      }),
      prisma.videoSubmission.count({ where }),
    ]);

    // Также загружаем заявки без подачи (взятые, но видео не подано)
    const pendingApplications = await prisma.taskApplication.findMany({
      where: {
        creatorId: userId,
        submission: null,
      },
      include: {
        ad: {
          select: {
            id: true,
            title: true,
            rpm: true,
            platform: true,
            status: true,
            submissionDeadline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      submissions: {
        data: submissions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      pendingApplications,
    });
  } catch (err) {
    console.error("[GET /api/submissions/my]", err);
    return serverError();
  }
}
