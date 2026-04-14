import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/reports/[id] — обновить статус жалобы (resolved: true/false).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const body = await req.json();
    const { resolved } = body as { resolved?: boolean };

    if (typeof resolved !== "boolean") {
      return badRequest("Поле resolved (true/false) обязательно");
    }

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Жалоба не найдена" }, { status: 404 });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { resolved },
      include: {
        submitter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/reports/[id]]", err);
    return serverError();
  }
}
