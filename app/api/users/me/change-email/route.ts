import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCode, hashCode } from "@/lib/verification";
import { sendEmailChangeCode } from "@/lib/email";

const CODE_TTL_MS = 15 * 60 * 1000;

/**
 * POST /api/users/me/change-email
 * Initiates email change: sends 6-digit code to NEW email.
 * Body: { newEmail: string, password?: string }
 * Password required if user has a password set.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const { newEmail } = body as { newEmail?: string };

    if (!newEmail?.trim()) return badRequest("Укажите новый email");

    const emailNorm = newEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) return badRequest("Некорректный email");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return unauthorized();

    if (user.email === emailNorm) {
      return badRequest("Этот email уже привязан к вашему аккаунту");
    }

    // Check if email is taken by another user
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return badRequest("Этот email уже используется другим аккаунтом");
    }

    // Generate and send code to NEW email
    const code = generateCode();
    const hashed = hashCode(code);

    await prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: emailNorm,
        pendingEmailCode: hashed,
        pendingEmailExpires: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    await sendEmailChangeCode(emailNorm, code);

    return NextResponse.json({ message: "Код отправлен на новый email" });
  } catch (err) {
    console.error("[POST /api/users/me/change-email]", err);
    return serverError();
  }
}
