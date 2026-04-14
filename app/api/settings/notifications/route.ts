import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/notifications
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    // Если настроек нет — создаём с дефолтными значениями
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    return NextResponse.json(settings);
  } catch (err) {
    console.error("[GET /api/settings/notifications]", err);
    return serverError();
  }
}

// PUT /api/settings/notifications
export async function PUT(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const {
      emailReplies,
      emailTasks,
      emailNews,
      smsImportant,
      pushMessages,
    } = body;

    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        emailReplies: emailReplies ?? true,
        emailTasks: emailTasks ?? true,
        emailNews: emailNews ?? false,
        smsImportant: smsImportant ?? true,
        pushMessages: pushMessages ?? false,
      },
      update: {
        ...(emailReplies !== undefined && { emailReplies }),
        ...(emailTasks !== undefined && { emailTasks }),
        ...(emailNews !== undefined && { emailNews }),
        ...(smsImportant !== undefined && { smsImportant }),
        ...(pushMessages !== undefined && { pushMessages }),
      },
    });

    return NextResponse.json(settings);
  } catch (err) {
    console.error("[PUT /api/settings/notifications]", err);
    return serverError();
  }
}
