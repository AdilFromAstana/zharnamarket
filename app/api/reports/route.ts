import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getRequestIP } from "@/lib/rate-limit";

// Rate limit: 5 жалоб с IP за 15 минут
const limiter = createRateLimiter(5, 15 * 60 * 1000);

const VALID_TARGET_TYPES = new Set(["ad", "creator", "customer", "review"]);
const VALID_REASONS = new Set([
  "spam",
  "inappropriate",
  "fake",
  "scam",
  "harassment",
  "other",
]);

// POST /api/reports — отправить жалобу
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const ip = getRequestIP(req.headers);
    if (!limiter.check(ip)) {
      return NextResponse.json(
        { error: "Подождите перед повторной отправкой жалобы" },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { targetType, targetId, reason, description } = body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      description?: string;
    };

    if (!targetType || !VALID_TARGET_TYPES.has(targetType)) {
      return badRequest("Недопустимый тип цели жалобы");
    }
    if (!targetId) return badRequest("ID цели обязателен");
    if (!reason || !VALID_REASONS.has(reason)) {
      return badRequest("Недопустимая причина жалобы");
    }
    if (description && description.length > 2000) {
      return badRequest("Описание не может быть длиннее 2000 символов");
    }

    // Формируем reason с описанием
    const fullReason = description?.trim()
      ? `${reason}: ${description.trim()}`
      : reason;

    const report = await prisma.report.create({
      data: {
        submitterId: userId,
        targetType: targetType as "ad" | "creator" | "customer" | "review",
        targetId,
        reason: fullReason,
      },
    });

    return NextResponse.json({ id: report.id, message: "Жалоба отправлена" }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reports]", err);
    return serverError();
  }
}
