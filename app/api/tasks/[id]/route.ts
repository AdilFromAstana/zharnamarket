import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAdFields, validateAdPatchField, validateContacts } from "@/lib/validation";

const AD_INCLUDE = {
  boosts: {
    where: { expiresAt: { gt: new Date() } },
    select: { boostType: true, expiresAt: true },
  },
  owner: {
    select: {
      id: true,
      name: true,
      advertiserProfile: {
        select: { companyName: true, displayName: true, verified: true },
      },
    },
  },
  videoFormat: { select: { id: true, key: true, label: true, description: true, icon: true } },
  adFormat: { select: { id: true, key: true, label: true, description: true, icon: true } },
  adSubject: { select: { id: true, key: true, label: true, description: true, icon: true } },
};

// GET /api/ads/[id] — публичное детальное объявление
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ad = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
      include: AD_INCLUDE,
    });

    if (!ad) return notFound("Объявление не найдено");

    // Lazy expiry: закрываем окно race-condition с cron
    if (
      ad.status === "active" &&
      ad.expiresAt !== null &&
      ad.expiresAt < new Date()
    ) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { status: "expired" },
      });
      ad.status = "expired";
    }

    // Просмотры теперь учитываются отдельным роутом POST /api/ads/[id]/view
    // с dedupe по ipHash (см. lib/views.ts). GET не инкрементирует счётчик,
    // чтобы F5 / бот-краулеры / preflight-запросы не накручивали статистику.

    return NextResponse.json(ad);
  } catch (err) {
    console.error("[GET /api/ads/[id]]", err);
    return serverError();
  }
}

// PUT /api/ads/[id] — полное обновление объявления
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Объявление не найдено");
    if (existing.ownerId !== userId) return forbidden();

    const body = await req.json();
    const {
      title,
      platform,
      city,
      category,
      description,
      budgetType,
      budgetFrom,
      budgetTo,
      budgetDetails,
      contacts,
      images,
    } = body;

    // Валидация обязательных полей + enum + длины
    const validationError = validateAdFields(body);
    if (validationError) return badRequest(validationError);

    const contactsError = validateContacts(contacts);
    if (contactsError) return badRequest(contactsError);

    if (images !== undefined) {
      if (!Array.isArray(images)) return badRequest("images должен быть массивом");
      if (images.length > 10) return badRequest("Максимум 10 фото");
    }

    const ad = await prisma.ad.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        platform,
        city,
        category,
        budgetType,
        budgetFrom: budgetFrom ?? null,
        budgetTo: budgetTo ?? null,
        budgetDetails: budgetDetails ?? null,
        contactTelegram: contacts?.telegram ?? null,
        contactWhatsapp: contacts?.whatsapp ?? null,
        contactPhone: contacts?.phone ?? null,
        contactEmail: contacts?.email ?? null,
        images: images ?? [],
      },
      include: AD_INCLUDE,
    });

    return NextResponse.json(ad);
  } catch (err) {
    console.error("[PUT /api/ads/[id]]", err);
    return serverError();
  }
}

// PATCH /api/ads/[id] — частичное обновление
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Объявление не найдено");
    if (existing.ownerId !== userId) return forbidden();

    const body = await req.json();
    // Фильтруем undefined — оставляем только переданные поля
    const allowedFields = [
      "title",
      "description",
      "platform",
      "city",
      "category",
      "budgetType",
      "budgetFrom",
      "budgetTo",
      "budgetDetails",
      "images",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        // Валидируем каждое поле
        const fieldError = validateAdPatchField(field, body[field]);
        if (fieldError) return badRequest(fieldError);
        data[field] = body[field];
      }
    }

    // Handle new category dimension IDs
    for (const [field, model] of [
      ["videoFormatId", "videoFormat"],
      ["adFormatId", "adFormat"],
      ["adSubjectId", "adSubject"],
    ] as const) {
      if (field in body) {
        const val = body[field];
        if (val === null || val === "") {
          data[field] = null;
        } else if (typeof val === "string") {
          const delegate = (prisma as any)[model];
          const rec = await delegate.findUnique({ where: { id: val }, select: { isActive: true } });
          if (!rec) return badRequest(`${model} не найден`);
          if (!rec.isActive) return badRequest(`${model} деактивирован`);
          data[field] = val;
        }
      }
    }

    // Валидация и маппинг контактов
    if ("contacts" in body) {
      const contactsError = validateContacts(body.contacts);
      if (contactsError) return badRequest(contactsError);
      data.contactTelegram = body.contacts?.telegram ?? null;
      data.contactWhatsapp = body.contacts?.whatsapp ?? null;
      data.contactPhone = body.contacts?.phone ?? null;
      data.contactEmail = body.contacts?.email ?? null;
    }

    const ad = await prisma.ad.update({
      where: { id },
      data,
      include: AD_INCLUDE,
    });

    return NextResponse.json(ad);
  } catch (err) {
    console.error("[PATCH /api/ads/[id]]", err);
    return serverError();
  }
}

// DELETE /api/ads/[id] — soft-delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.ad.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return notFound("Объявление не найдено");
    if (existing.ownerId !== userId) return forbidden();

    await prisma.ad.update({
      where: { id },
      data: { deletedAt: new Date(), status: "deleted" },
    });

    return NextResponse.json({ message: "Объявление удалено" });
  } catch (err) {
    console.error("[DELETE /api/ads/[id]]", err);
    return serverError();
  }
}
