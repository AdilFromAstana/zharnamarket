import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashCode } from "@/lib/verification";

/**
 * POST /api/users/me/verify-email-change
 * Verifies the 6-digit code and updates the user's email.
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code?.trim()) return badRequest("Код обязателен");

    const codeClean = code.trim().replace(/\s/g, "");
    if (!/^\d{6}$/.test(codeClean)) {
      return badRequest("Код должен содержать 6 цифр");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return unauthorized();

    if (!user.pendingEmail || !user.pendingEmailCode || !user.pendingEmailExpires) {
      return badRequest("Нет ожидающего подтверждения email");
    }

    if (new Date() > user.pendingEmailExpires) {
      return badRequest("Код истёк. Запросите новый.");
    }

    const hashedInput = hashCode(codeClean);
    if (hashedInput !== user.pendingEmailCode) {
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    // Check again that email is not taken (race condition guard)
    const existing = await prisma.user.findUnique({
      where: { email: user.pendingEmail },
    });
    if (existing && existing.id !== userId) {
      return badRequest("Этот email уже используется другим аккаунтом");
    }

    // Update email
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        emailVerified: true,
        pendingEmail: null,
        pendingEmailCode: null,
        pendingEmailExpires: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        avatarColor: true,
        role: true,
        emailVerified: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/users/me/verify-email-change]", err);
    return serverError();
  }
}
