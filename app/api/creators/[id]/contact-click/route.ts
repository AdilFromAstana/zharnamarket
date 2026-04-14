import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getRequestIP } from "@/lib/rate-limit";

// Rate limit: 5 кликов с одного IP в минуту
const limiter = createRateLimiter(5, 60 * 1000);

// POST /api/creators/[id]/contact-click — зафиксировать клик «Связаться» на профиле креатора
// Анонимный: увеличивает contactClickCount
// Авторизованный: дополнительно создаёт ContactInteraction (для отзывов)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getRequestIP(req.headers);
    if (!limiter.check(ip)) {
      return NextResponse.json({ ok: true }); // Молча игнорируем
    }

    const { id } = await params;

    // Инкрементируем счётчик (публичный, как для Ad)
    await prisma.creatorProfile.updateMany({
      where: { id, isPublished: true },
      data: { contactClickCount: { increment: 1 } },
    });

    // Если авторизован — создаём/обновляем ContactInteraction
    const userId = await getCurrentUserId(req);
    if (userId) {
      // Проверяем что пользователь не нажимает на свой профиль
      const profile = await prisma.creatorProfile.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (profile && profile.userId !== userId) {
        await prisma.contactInteraction.upsert({
          where: {
            userId_creatorProfileId: {
              userId,
              creatorProfileId: id,
            },
          },
          create: {
            userId,
            creatorProfileId: id,
          },
          update: {
            // Обновляем timestamp при повторном клике
            createdAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/creators/[id]/contact-click]", err);
    return serverError();
  }
}
