import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAppealResolvedEmail } from "@/lib/email";

/**
 * POST /api/admin/appeals/[id]/resolve — Рассмотреть апелляцию.
 * Body: { decision: "approved" | "rejected", comment?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "admin") return unauthorized();

    const { id: appealId } = await params;
    const body = await req.json();
    const { decision, comment } = body;

    if (!decision || (decision !== "approved" && decision !== "rejected")) {
      return badRequest("Укажите решение: approved или rejected");
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        submission: {
          include: {
            ad: { select: { title: true } },
            creator: { select: { email: true } },
          },
        },
      },
    });

    if (!appeal) return badRequest("Апелляция не найдена");
    if (appeal.status !== "pending") return badRequest("Апелляция уже рассмотрена");

    await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: decision,
        reviewedBy: userId,
        reviewComment: comment?.trim() ?? null,
        resolvedAt: new Date(),
      },
    });

    // Если одобрена — вернуть подачу обратно на модерацию
    if (decision === "approved") {
      await prisma.videoSubmission.update({
        where: { id: appeal.submissionId },
        data: { status: "submitted" },
      });
    }

    // Уведомление креатору. Fire-and-forget.
    if (appeal.submission.creator?.email) {
      sendAppealResolvedEmail(appeal.submission.creator.email, {
        taskTitle: appeal.submission.ad?.title ?? "(без названия)",
        decision,
        comment: comment?.trim() ?? null,
        submissionId: appeal.submissionId,
      }).catch((err) => {
        console.error("[resolve] creator email failed:", err);
      });
    }

    return NextResponse.json({ ok: true, decision });
  } catch (err) {
    console.error("[POST /api/admin/appeals/[id]/resolve]", err);
    return serverError();
  }
}
