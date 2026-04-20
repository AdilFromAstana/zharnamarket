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
import { Platform } from "@prisma/client";
import {
  isValidEnum,
  isValidFromArray,
  VALID_PLATFORMS,
  VALID_AVAILABILITY,
  checkLength,
  LIMITS,
  validateContacts,
} from "@/lib/validation";
import { validateProfanityFields } from "@/lib/content-moderation";
import { autoThumbnailForUrl } from "@/lib/video-thumbnail";
import { persistThumbnailIfEphemeral } from "@/lib/thumbnail-store";
import { deleteLocalUploads, isLocalUpload } from "@/lib/upload-cleanup";

// Get valid category and city keys from database for validation
async function getValidReferenceData() {
  const [categories, cities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { key: true, label: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      select: { key: true, label: true },
    }),
  ]);

  return {
    validCategoryKeys: categories.map((c) => c.key),
    validCityKeys: cities.map((c) => c.key),
    categoryLabelToKey: Object.fromEntries(
      categories.map((c) => [c.label, c.key]),
    ),
    cityLabelToKey: Object.fromEntries(cities.map((c) => [c.label, c.key])),
  };
}

function getCreatorInclude() {
  return {
    platforms: true,
    portfolio: {
      orderBy: { createdAt: "desc" as const },
      include: {
        category: { select: { id: true, key: true, label: true } },
      },
    },
    priceItems: { orderBy: { sortOrder: "asc" as const } },
    boosts: { where: { expiresAt: { gte: new Date() } } },
    user: { select: { id: true, name: true, email: true, avatarColor: true } },
    city: { select: { id: true, key: true, label: true } },
    categories: { select: { id: true, key: true, label: true } },
  };
}

// GET /api/creators/[id] — публичный профиль
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const profile = await prisma.creatorProfile.findUnique({
      where: { id },
      include: getCreatorInclude(),
    });
    if (!profile) return notFound("Профиль не найден");

    // Обновляем lastActiveAt для публичного просмотра
    prisma.creatorProfile
      .update({ where: { id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[GET /api/creators/[id]]", err);
    return serverError();
  }
}

// PUT /api/creators/[id] — полное обновление
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.creatorProfile.findUnique({ where: { id } });
    if (!existing) return notFound("Профиль не найден");
    if (existing.userId !== userId) return forbidden();

    const body = await req.json();
    const {
      title,
      fullName,
      city,
      bio,
      age,
      username,
      availability,
      contentCategories,
      platforms,
      contacts,
      pricing,
    } = body;

    if (!title?.trim()) return badRequest("Название обязательно");
    const titleErr = checkLength(
      title?.trim(),
      "Название",
      LIMITS.title.min,
      LIMITS.title.max,
    );
    if (titleErr) return badRequest(titleErr);

    if (!fullName?.trim()) return badRequest("Имя обязательно");
    const nameErr = checkLength(
      fullName?.trim(),
      "Имя",
      LIMITS.name.min,
      LIMITS.name.max,
    );
    if (nameErr) return badRequest(nameErr);

    // Validate city/categories — accept EN key or RU label
    const {
      validCategoryKeys,
      validCityKeys,
      categoryLabelToKey,
      cityLabelToKey,
    } = await getValidReferenceData();

    const resolveCityKey = (v: string): string | null => {
      if (!v) return null;
      if (validCityKeys.includes(v)) return v;
      if (cityLabelToKey[v]) return cityLabelToKey[v];
      return null;
    };
    const resolveCategoryKey = (v: string): string | null => {
      if (!v) return null;
      if (validCategoryKeys.includes(v)) return v;
      if (categoryLabelToKey[v]) return categoryLabelToKey[v];
      return null;
    };

    if (contentCategories) {
      for (const cat of contentCategories) {
        if (!resolveCategoryKey(cat)) {
          return badRequest(`Недопустимая категория: ${cat}`);
        }
      }
    }

    // City validation
    if (city && !resolveCityKey(city)) {
      return badRequest(`Недопустимый город: ${city}`);
    }
    if (platforms) {
      for (const p of platforms) {
        if (!isValidEnum(String(p.name), VALID_PLATFORMS)) {
          return badRequest(`Недопустимая платформа: ${p.name}`);
        }
      }
    }
    if (
      availability &&
      !isValidEnum(String(availability), VALID_AVAILABILITY)
    ) {
      return badRequest("Недопустимое значение доступности");
    }
    if (bio) {
      const bioErr = checkLength(bio, "Биография", 0, LIMITS.bio.max);
      if (bioErr) return badRequest(bioErr);
    }
    if (
      age !== undefined &&
      age !== null &&
      (typeof age !== "number" || age < 0 || age > 120)
    ) {
      return badRequest("Возраст должен быть от 0 до 120");
    }
    const contactsErr = validateContacts(contacts);
    if (contactsErr) return badRequest(contactsErr);

    const profanityErr = validateProfanityFields({
      "Название профиля": title,
      Имя: fullName,
      "Ник (username)": username,
      "О себе (bio)": bio,
    });
    if (profanityErr) return badRequest(profanityErr);

    const detectPlatform = (url: string): Platform => {
      const u = url.toLowerCase();
      if (u.includes("tiktok.com")) return "TikTok";
      if (u.includes("instagram.com")) return "Instagram";
      if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
      if (u.includes("threads.net")) return "Threads";
      if (u.includes("t.me") || u.includes("telegram.me")) return "Telegram";
      if (
        u.includes("vk.com") ||
        u.includes("vkvideo.ru") ||
        u.includes("vk.ru")
      ) {
        return "VK";
      }
      return "TikTok";
    };

    const rawPortfolio: Array<{
      videoUrl?: string;
      category?: string | null;
      description?: string | null;
      thumbnail?: string | null;
      views?: number | null;
      likes?: number | null;
    }> =
      body.portfolio !== undefined && Array.isArray(body.portfolio)
        ? body.portfolio.filter(
            (p: { videoUrl?: string }) => p?.videoUrl?.trim(),
          )
        : [];
    const portfolioInput = await Promise.all(
      rawPortfolio.map(async (item) => {
        const catKey = item.category ? resolveCategoryKey(item.category) : null;
        const catRecord = catKey
          ? await prisma.category.findUnique({ where: { key: catKey } })
          : null;
        const videoUrl = item.videoUrl!.trim();
        const rawThumbnail =
          item.thumbnail?.trim() || autoThumbnailForUrl(videoUrl) || "";
        const thumbnail = rawThumbnail
          ? (await persistThumbnailIfEphemeral(rawThumbnail)) ?? ""
          : "";
        const views =
          typeof item.views === "number" && Number.isFinite(item.views)
            ? Math.max(0, Math.floor(item.views))
            : null;
        const likes =
          typeof item.likes === "number" && Number.isFinite(item.likes)
            ? Math.max(0, Math.floor(item.likes))
            : null;
        return {
          videoUrl,
          platform: detectPlatform(videoUrl),
          thumbnail,
          description: item.description ?? null,
          categoryId: catRecord?.id ?? null,
          views,
          likes,
        };
      }),
    );

    // Собираем старые локальные thumbnail'ы до удаления, чтобы потом
    // удалить с диска те, что больше не используются.
    const oldLocalThumbnails: string[] =
      body.portfolio !== undefined
        ? (
            await prisma.portfolioItem.findMany({
              where: { profileId: id },
              select: { thumbnail: true },
            })
          )
            .map((i: { thumbnail: string | null }) => i.thumbnail)
            .filter(isLocalUpload)
        : [];

    // Всё в одной транзакции: delete + update + create
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await prisma.$transaction(async (tx: any) => {
      // Удаляем старые платформы, прайс-лист и портфолио
      await Promise.all([
        tx.creatorPlatform.deleteMany({ where: { profileId: id } }),
        ...(pricing?.items !== undefined
          ? [tx.creatorPriceItem.deleteMany({ where: { profileId: id } })]
          : []),
        ...(body.portfolio !== undefined
          ? [tx.portfolioItem.deleteMany({ where: { profileId: id } })]
          : []),
      ]);

      // Resolve to DB IDs (accept EN key or RU label)
      const cityKey = city ? resolveCityKey(city) : null;
      const cityRecord = cityKey
        ? await prisma.city.findUnique({ where: { key: cityKey } })
        : null;

      const categoryIds: string[] = [];
      if (contentCategories) {
        for (const catInput of contentCategories) {
          const catKey = resolveCategoryKey(catInput);
          if (catKey) {
            const catRecord = await prisma.category.findUnique({
              where: { key: catKey },
            });
            if (catRecord) {
              categoryIds.push(catRecord.id);
            }
          }
        }
      }

      // Обновляем профиль + создаём новые связанные записи
      return tx.creatorProfile.update({
        where: { id },
        data: {
          title: title.trim(),
          fullName: fullName.trim(),
          cityId: cityRecord?.id,
          bio: bio ?? null,
          age: age ?? null,
          username: username ?? null,
          avatar: body.avatar !== undefined ? body.avatar : undefined,
          screenshots:
            body.screenshots !== undefined ? body.screenshots : undefined,
          availability: availability ?? "available",
          categories: {
            set: categoryIds.map((id) => ({ id })),
          },
          contactTelegram: contacts?.telegram ?? null,
          contactWhatsapp: contacts?.whatsapp ?? null,
          contactPhone: contacts?.phone ?? null,
          contactEmail: contacts?.email ?? null,
          minimumRate: pricing?.minimumRate ?? 0,
          negotiable: pricing?.negotiable ?? true,
          // Платформы
          platforms: {
            create: (platforms ?? []).map(
              (p: {
                name: string;
                handle: string;
                url: string;
                followers?: number | null;
              }) => ({
                name: p.name,
                handle: p.handle ?? "",
                url: p.url ?? "",
                followers: p.followers ?? null,
              }),
            ),
          },
          // Прайс-лист (если передан)
          ...(pricing?.items !== undefined && {
            priceItems: {
              create: (pricing.items ?? []).map(
                (item: { label: string; price: number }, idx: number) => ({
                  label: item.label,
                  price: item.price,
                  sortOrder: idx,
                }),
              ),
            },
          }),
          // Портфолио (если передано)
          ...(body.portfolio !== undefined && {
            portfolio: {
              create: portfolioInput.map((item) => ({
                videoUrl: item.videoUrl,
                platform: item.platform,
                thumbnail: item.thumbnail,
                description: item.description,
                ...(item.categoryId
                  ? { category: { connect: { id: item.categoryId } } }
                  : {}),
                views: item.views,
                likes: item.likes,
              })),
            },
          }),
        },
        include: getCreatorInclude(),
      });
    });

    // Чистим локальные thumbnail'ы, которые больше не используются.
    if (body.portfolio !== undefined && oldLocalThumbnails.length > 0) {
      const newThumbnails = new Set(portfolioInput.map((i) => i.thumbnail));
      const orphans = oldLocalThumbnails.filter((t) => !newThumbnails.has(t));
      if (orphans.length > 0) {
        await deleteLocalUploads(orphans);
      }
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[PUT /api/creators/[id]]", err);
    return serverError();
  }
}

// PATCH /api/creators/[id] — частичное обновление
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.creatorProfile.findUnique({ where: { id } });
    if (!existing) return notFound("Профиль не найден");
    if (existing.userId !== userId) return forbidden();

    const body = await req.json();
    const allowedFields = [
      "title",
      "fullName",
      "city",
      "bio",
      "age",
      "username",
      "availability",
      "contentCategories",
      "minimumRate",
      "negotiable",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }
    if ("contacts" in body) {
      data.contactTelegram = body.contacts?.telegram ?? null;
      data.contactWhatsapp = body.contacts?.whatsapp ?? null;
      data.contactPhone = body.contacts?.phone ?? null;
      data.contactEmail = body.contacts?.email ?? null;
    }
    if ("pricing" in body) {
      if (body.pricing?.minimumRate !== undefined)
        data.minimumRate = body.pricing.minimumRate;
      if (body.pricing?.negotiable !== undefined)
        data.negotiable = body.pricing.negotiable;
    }

    const profile = await prisma.creatorProfile.update({
      where: { id },
      data,
      include: getCreatorInclude(),
    });

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[PATCH /api/creators/[id]]", err);
    return serverError();
  }
}

// DELETE /api/creators/[id] — удалить профиль
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await prisma.creatorProfile.findUnique({
      where: { id },
      select: {
        userId: true,
        avatar: true,
        screenshots: true,
        portfolio: { select: { thumbnail: true } },
      },
    });
    if (!existing) return notFound("Профиль не найден");
    if (existing.userId !== userId) return forbidden();

    await prisma.creatorProfile.delete({ where: { id } });

    // Чистим файлы с диска после успешного удаления записи.
    await deleteLocalUploads([
      existing.avatar,
      ...(existing.screenshots ?? []),
      ...existing.portfolio.map((p) => p.thumbnail),
    ]);

    return NextResponse.json({ message: "Профиль удалён" });
  } catch (err) {
    console.error("[DELETE /api/creators/[id]]", err);
    return serverError();
  }
}
