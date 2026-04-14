import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLength, isValidUrl, LIMITS } from "@/lib/validation";

// GET /api/users/me/advertiser-profile
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const profile = await prisma.advertiserProfile.findUnique({
      where: { userId },
    });

    return NextResponse.json(profile ?? null);
  } catch (err) {
    console.error("[GET /api/users/me/advertiser-profile]", err);
    return serverError();
  }
}

// PUT /api/users/me/advertiser-profile — создать или обновить (upsert)
export async function PUT(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const {
      displayName,
      companyName,
      companyType,
      city,
      description,
      telegram,
      whatsapp,
      website,
    } = body;

    // Validation
    if (displayName) {
      const err = checkLength(displayName, "Отображаемое имя", 0, LIMITS.name.max);
      if (err) return badRequest(err);
    }
    if (companyName) {
      const err = checkLength(companyName, "Название компании", 0, LIMITS.companyName.max);
      if (err) return badRequest(err);
    }
    if (description) {
      const err = checkLength(description, "Описание", 0, LIMITS.description.max);
      if (err) return badRequest(err);
    }
    if (website && !isValidUrl(website)) {
      return badRequest("Сайт должен быть корректным URL (http/https)");
    }
    if (telegram) {
      const err = checkLength(telegram, "Telegram", 0, LIMITS.contactField.max);
      if (err) return badRequest(err);
    }
    if (whatsapp) {
      const err = checkLength(whatsapp, "WhatsApp", 0, LIMITS.contactField.max);
      if (err) return badRequest(err);
    }

    const profile = await prisma.advertiserProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: displayName ?? null,
        companyName: companyName ?? null,
        companyType: companyType ?? null,
        city: city ?? null,
        description: description ?? null,
        telegram: telegram ?? null,
        whatsapp: whatsapp ?? null,
        website: website ?? null,
      },
      update: {
        displayName: displayName ?? null,
        companyName: companyName ?? null,
        companyType: companyType ?? null,
        city: city ?? null,
        description: description ?? null,
        telegram: telegram ?? null,
        whatsapp: whatsapp ?? null,
        website: website ?? null,
      },
    });

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[PUT /api/users/me/advertiser-profile]", err);
    return serverError();
  }
}
