import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";

/** Время жизни кода подтверждения — 15 минут */
const CODE_TTL_MS = 15 * 60 * 1000;

/** Генерирует 6-значный код (000000–999999) */
export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** SHA-256 хеш кода (храним в БД, не сам код) */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Генерирует код, сохраняет хеш в user, отправляет email.
 * Используется при регистрации, логине неверифицированного, повторной отправке.
 */
export async function generateAndSendCode(userId: string, email: string): Promise<void> {
  const code = generateCode();
  const hashed = hashCode(code);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: hashed,
      emailVerificationExpires: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  await sendVerificationCode(email, code);
}
