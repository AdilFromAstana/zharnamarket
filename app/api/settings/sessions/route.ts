import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/sessions — активные сессии
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const sessions = await prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
      take: 50,
      select: {
        id: true,
        device: true,
        os: true,
        browser: true,
        ip: true,
        isCurrent: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(sessions);
  } catch (err) {
    console.error("[GET /api/settings/sessions]", err);
    return serverError();
  }
}

// DELETE /api/settings/sessions — завершить все другие сессии
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    await prisma.session.deleteMany({
      where: { userId, isCurrent: false },
    });

    return NextResponse.json({ message: "Все другие сессии завершены" });
  } catch (err) {
    console.error("[DELETE /api/settings/sessions]", err);
    return serverError();
  }
}
