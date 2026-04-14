import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError } from "@/lib/auth";
import { generateAndSendCode } from "@/lib/verification";

// ─── Rate limiter: 3 запроса / 15 мин на IP ────────────────────────────────
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_RESENDS = 3;
const resendAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = resendAttempts.get(ip);
  if (!record || now > record.resetAt) {
    resendAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= MAX_RESENDS) return false;
  record.count++;
  return true;
}

/**
 * POST /api/auth/resend-code — повторная отправка кода подтверждения.
 * Всегда возвращает 200 (не раскрывает наличие email в системе).
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте через 15 минут." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email?.trim()) return badRequest("Email обязателен");

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, emailVerified: true },
    });

    // Всегда 200 — не раскрываем наличие email
    if (!user || user.emailVerified) {
      return NextResponse.json({ sent: true });
    }

    await generateAndSendCode(user.id, user.email);

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[POST /api/auth/resend-code]", err);
    return serverError();
  }
}
