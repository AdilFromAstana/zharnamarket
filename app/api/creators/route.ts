import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  safeInt,
  safeFloat,
  isValidEnum,
  VALID_PLATFORMS,
  VALID_CITIES,
  VALID_CATEGORIES,
  VALID_AVAILABILITY,
  checkLength,
  LIMITS,
  validateContacts,
} from "@/lib/validation";
import { distributeBoostedByTier, countBoostedBeforePage } from "@/lib/interleave-boosts";

function getCreatorInclude() {
  return {
    platforms: true,
    portfolio: { orderBy: { createdAt: "desc" as const } },
    priceItems: { orderBy: { sortOrder: "asc" as const } },
    boosts: { where: { expiresAt: { gte: new Date() } } },
    user: {
      select: { id: true, name: true, email: true, avatarColor: true },
    },
  };
}

/** Split comma-separated query param into a validated array */
function parseCSV(val: string | null): string[] {
  return val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

// GET /api/creators — публичный каталог креаторов (с faceted counts)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // --- Multi-select params (comma-separated DB enum codes) ---
    const cities = parseCSV(searchParams.get("city")).filter((c) => VALID_CITIES.has(c));
    const platforms = parseCSV(searchParams.get("platform")).filter((p) => VALID_PLATFORMS.has(p));
    const categories = parseCSV(searchParams.get("category")).filter((c) => VALID_CATEGORIES.has(c));
    const availabilities = parseCSV(searchParams.get("availability")).filter((a) => VALID_AVAILABILITY.has(a));

    // --- Single-value params ---
    const parsedMaxRate = safeFloat(searchParams.get("maxRate"));
    const parsedMinRating = safeFloat(searchParams.get("minRating"));
    const verified = searchParams.get("verified");
    const search = searchParams.get("search")?.trim();
    const sortBy = searchParams.get("sortBy") ?? "new";
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 20));
    const skip = (page - 1) * limit;

    // --- Prisma filter primitives ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cityFilter: any = cities.length ? { in: cities } : undefined;
    const platformFilter = platforms.length ? platforms : undefined;
    const categoryFilter = categories.length ? categories : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availabilityFilter: any = availabilities.length ? { in: availabilities } : undefined;

    // Base where — always applied to every query (non-faceted conditions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = {
      isPublished: true,
      ...(parsedMaxRate !== null && { minimumRate: { lte: parsedMaxRate } }),
      ...(verified === "true" && { verified: true }),
      ...(parsedMinRating !== null && { averageRating: { gte: parsedMinRating } }),
    };

    // Текстовый поиск по title, fullName, bio (case-insensitive)
    if (search && search.length >= 2) {
      baseWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
      ];
    }

    // Full where clause (all filters applied)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(categoryFilter && { contentCategories: { hasSome: categoryFilter } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };

    // --- Sort (без raisedAt — распределение бустнутых идёт через два запроса) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any;
    if (sortBy === "price") orderBy = { minimumRate: "asc" };
    else if (sortBy === "alphabet") orderBy = { fullName: "asc" };
    else if (sortBy === "rating") orderBy = [{ averageRating: "desc" }, { reviewCount: "desc" }];
    else if (sortBy === "popular") orderBy = { contactClickCount: "desc" };
    else orderBy = { createdAt: "desc" };

    // --- Faceted counts (each excludes its own dimension) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cityFacetWhere: any = {
      ...baseWhere,
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(categoryFilter && { contentCategories: { hasSome: categoryFilter } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platformFacetWhere: any = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(categoryFilter && { contentCategories: { hasSome: categoryFilter } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryFacetWhere: any = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(availabilityFilter && { availability: availabilityFilter }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availabilityFacetWhere: any = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platforms: { some: { name: { in: platformFilter } } } }),
      ...(categoryFilter && { contentCategories: { hasSome: categoryFilter } }),
    };

    // Category values for parallel counts (contentCategories is a Postgres array —
    // groupBy not supported, so we count each known value individually)
    const CATEGORY_VALUES = [...VALID_CATEGORIES];

    // --- Два запроса: бустнутые + обычные, распределённые по страницам ---
    const now = new Date();
    const boostedWhere = { ...where, boosts: { some: { expiresAt: { gte: now } } } };
    const regularWhere = { ...where, NOT: { boosts: { some: { expiresAt: { gte: now } } } } };

    // Считаем общее кол-во и кол-во бустнутых (+ фасеты параллельно)
    const [
      [total, totalBoosted, cityCounts, availabilityCounts, platformCounts],
      categoryCountResults,
    ] = await Promise.all([
      Promise.all([
        prisma.creatorProfile.count({ where }),
        prisma.creatorProfile.count({ where: boostedWhere }),
        prisma.creatorProfile.groupBy({ by: ["city"], where: cityFacetWhere, _count: true }),
        prisma.creatorProfile.groupBy({ by: ["availability"], where: availabilityFacetWhere, _count: true }),
        prisma.creatorPlatform.groupBy({ by: ["name"], where: { profile: platformFacetWhere }, _count: true }),
      ]),
      Promise.all(
        CATEGORY_VALUES.map((cat) =>
          prisma.creatorProfile.count({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { ...categoryFacetWhere, contentCategories: { has: cat as any } },
          }),
        ),
      ),
    ]);

    // Рассчитываем слоты для бустнутых на каждую страницу (interleaved по тирам)
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Загружаем ВСЕ бустнутые (их немного) — нужны для распределения по тирам
    const include = getCreatorInclude();
    const allBoosted = totalBoosted > 0
      ? await prisma.creatorProfile.findMany({
          where: boostedWhere, orderBy, include,
        })
      : [];

    // Per-visitor seed: разные посетители видят разный порядок бустов
    const visitorId = req.cookies.get("vw_vid")?.value;

    // Пропорциональное распределение: каждая страница получает микс Premium+VIP+Rise
    const boostedItems = distributeBoostedByTier(allBoosted, page, totalPages, visitorId);
    const boostedOnThisPage = boostedItems.length;
    const boostedBefore = countBoostedBeforePage(allBoosted, page, totalPages, visitorId);
    const regularTake = limit - boostedOnThisPage;
    const regularSkip = (page - 1) * limit - boostedBefore;

    const regularItems = await prisma.creatorProfile.findMany({
      where: regularWhere, orderBy, skip: Math.max(0, regularSkip), take: regularTake, include,
    });

    // Бустнутые наверху (уже отсортированы по приоритету), обычные после них
    const creators = [...boostedItems, ...regularItems];

    const facets = {
      city: Object.fromEntries(cityCounts.map((r) => [r.city, r._count])),
      availability: Object.fromEntries(availabilityCounts.map((r) => [r.availability, r._count])),
      platform: Object.fromEntries(platformCounts.map((r) => [r.name, r._count])),
      category: Object.fromEntries(
        CATEGORY_VALUES.map((cat, i) => [cat, categoryCountResults[i]]).filter(([, c]) => (c as number) > 0),
      ),
    };

    return NextResponse.json({
      data: creators,
      pagination: { page, limit, total, totalPages },
      facets,
    });
  } catch (err) {
    console.error("[GET /api/creators]", err);
    return serverError();
  }
}

// POST /api/creators — создать профиль-анкету (требует авторизации)
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const body = await req.json();
    const {
      title,
      fullName,
      city,
      platforms,
      contentCategories,
      contacts,
      pricing,
      bio,
      age,
      username,
      availability,
    } = body;

    // Валидация
    if (!title?.trim()) return badRequest("Название профиля обязательно");
    const titleErr = checkLength(title?.trim(), "Название", LIMITS.title.min, LIMITS.title.max);
    if (titleErr) return badRequest(titleErr);

    if (!fullName?.trim()) return badRequest("Имя обязательно");
    const nameErr = checkLength(fullName?.trim(), "Имя", LIMITS.name.min, LIMITS.name.max);
    if (nameErr) return badRequest(nameErr);

    if (!city) return badRequest("Город обязателен");
    if (!platforms?.length) return badRequest("Укажите хотя бы одну платформу");
    if (!contentCategories?.length)
      return badRequest("Укажите хотя бы одну категорию");

    // Enum validation
    for (const cat of contentCategories) {
      if (!isValidEnum(String(cat), VALID_CATEGORIES)) {
        return badRequest(`Недопустимая категория: ${cat}`);
      }
    }
    for (const p of platforms) {
      if (!isValidEnum(String(p.name), VALID_PLATFORMS)) {
        return badRequest(`Недопустимая платформа: ${p.name}`);
      }
    }
    if (availability && !isValidEnum(String(availability), VALID_AVAILABILITY)) {
      return badRequest("Недопустимое значение доступности");
    }
    if (bio) {
      const bioErr = checkLength(bio, "Биография", 0, LIMITS.bio.max);
      if (bioErr) return badRequest(bioErr);
    }
    if (age !== undefined && age !== null && (typeof age !== "number" || age < 0 || age > 120)) {
      return badRequest("Возраст должен быть от 0 до 120");
    }

    // Contact validation
    const contactsErr = validateContacts(contacts);
    if (contactsErr) return badRequest(contactsErr);

    const profile = await prisma.creatorProfile.create({
      data: {
        userId,
        title: title.trim(),
        fullName: fullName.trim(),
        city: city as any,
        contentCategories: contentCategories ?? [],
        bio: bio ?? null,
        age: age ?? null,
        username: username ?? null,
        availability: availability ?? "available",
        contactTelegram: contacts?.telegram ?? null,
        contactWhatsapp: contacts?.whatsapp ?? null,
        contactPhone: contacts?.phone ?? null,
        contactEmail: contacts?.email ?? null,
        minimumRate: pricing?.minimumRate ?? 0,
        negotiable: pricing?.negotiable ?? true,
        currency: pricing?.currency ?? "KZT",
        isPublished: true,
        publishedAt: new Date(),
        raisedAt: new Date(),
        platforms: {
          create: (platforms ?? []).map(
            (p: {
              name: string;
              handle: string;
              url: string;
              followers?: number | null;
            }) => ({
              name: p.name,
              handle: p.handle,
              url: p.url,
              followers: p.followers ?? null,
            }),
          ),
        },
        priceItems: {
          create: (pricing?.items ?? []).map(
            (item: { label: string; price: number }, idx: number) => ({
              label: item.label,
              price: item.price,
              sortOrder: idx,
            }),
          ),
        },
      },
      include: getCreatorInclude(),
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("[POST /api/creators]", err);
    return serverError();
  }
}
