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
    const { emailReplies, emailSecurity, emailNews } = body;

    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        emailReplies: emailReplies ?? true,
        emailSecurity: emailSecurity ?? true,
        emailNews: emailNews ?? false,
      },
      update: {
        ...(emailReplies !== undefined && { emailReplies }),
        ...(emailSecurity !== undefined && { emailSecurity }),
        ...(emailNews !== undefined && { emailNews }),
      },
    });

    return NextResponse.json(settings);
  } catch (err) {
    console.error("[PUT /api/settings/notifications]", err);
    return serverError();
  }
}
