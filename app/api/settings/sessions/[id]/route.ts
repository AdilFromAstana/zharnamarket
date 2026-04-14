import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, forbidden, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/settings/sessions/[id] — завершить конкретную сессию
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return notFound("Сессия не найдена");
    if (session.userId !== userId) return forbidden();

    await prisma.session.delete({ where: { id } });

    return NextResponse.json({ message: "Сессия завершена" });
  } catch (err) {
    console.error("[DELETE /api/settings/sessions/[id]]", err);
    return serverError();
  }
}
