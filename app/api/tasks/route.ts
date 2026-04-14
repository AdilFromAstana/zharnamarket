import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDbCity, toDbCategory } from "@/lib/enum-maps";
import {
  safeInt,
  validateAdFields,
  validateContacts,
  VALID_PLATFORMS,
  VALID_BUDGET_TYPES,
  isValidEnum,
} from "@/lib/validation";
import { distributeBoostedByTier, countBoostedBeforePage } from "@/lib/interleave-boosts";

// Типы статусов объявлений
type AdStatusFilter = "active" | "paused" | "expired" | "archived";

// GET /api/ads — публичный каталог объявлений с фасетными счётчиками
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const sortBy = searchParams.get("sortBy") ?? "new";
    const page = safeInt(searchParams.get("page"), 1);
    const limit = Math.min(50, safeInt(searchParams.get("limit"), 20));
    const skip = (page - 1) * limit;

    // Parse comma-separated multi-value filters into validated arrays
    const validCities = (searchParams.get("city") ?? "")
      .split(",").map((c) => toDbCity(c.trim())).filter((c) => c && c !== "AllCities");
    const validPlatforms = (searchParams.get("platform") ?? "")
      .split(",").filter((p) => p && isValidEnum(p, VALID_PLATFORMS));
    const validCategories = (searchParams.get("category") ?? "")
      .split(",").map((c) => toDbCategory(c.trim())).filter(Boolean);
    const validBudgetTypes = (searchParams.get("budgetType") ?? "")
      .split(",").filter((b) => b && isValidEnum(b, VALID_BUDGET_TYPES));
    const validPaymentModes = (searchParams.get("paymentMode") ?? "")
      .split(",").filter((p) => p && (p === "direct" || p === "escrow"));

    // New category dimension filters (by id or key)
    const videoFormatIds = (searchParams.get("videoFormat") ?? "")
      .split(",").filter(Boolean);
    const adFormatIds = (searchParams.get("adFormat") ?? "")
      .split(",").filter(Boolean);
    const adSubjectIds = (searchParams.get("adSubject") ?? "")
      .split(",").filter(Boolean);

    // Helper: build Prisma filter for a multi-value field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const multiFilter = (vals: string[]): any =>
      vals.length === 1 ? vals[0] : vals.length > 1 ? { in: vals } : undefined;

    const cityFilter = multiFilter(validCities);
    const platformFilter = multiFilter(validPlatforms);
    const categoryFilter = multiFilter(validCategories);
    const budgetTypeFilter = multiFilter(validBudgetTypes);
    const paymentModeFilter = multiFilter(validPaymentModes);

    // For new dimensions, resolve keys to ids if needed
    const resolveIds = async (ids: string[], model: "videoFormat" | "adFormat" | "adSubject") => {
      if (!ids.length) return undefined;
      // Check if values look like cuid ids or keys
      const isKeys = ids.some((v) => /^[A-Z]/.test(v));
      if (isKeys) {
        const delegate = prisma[model] as any;
        const records = await delegate.findMany({
          where: { key: { in: ids } },
          select: { id: true },
        });
        const resolvedIds = records.map((r: { id: string }) => r.id);
        return resolvedIds.length ? multiFilter(resolvedIds) : undefined;
      }
      return multiFilter(ids);
    };

    const videoFormatFilter = await resolveIds(videoFormatIds, "videoFormat");
    const adFormatFilter = await resolveIds(adFormatIds, "adFormat");
    const adSubjectFilter = await resolveIds(adSubjectIds, "adSubject");

    // Base conditions (always applied, including search)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = {
      status: { in: ["active", "paused"] satisfies AdStatusFilter[] },
      deletedAt: null,
    };

    // Add text search to base (affects all facets)
    if (search && search.length >= 2) {
      baseWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Full where clause for main query (all filters applied)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };

    // Сортировка (без raisedAt — распределение бустнутых идёт через два запроса)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any =
      sortBy === "rpm"
        ? { rpm: "desc" }
        : sortBy === "budget"
          ? { budgetFrom: "desc" }
          : { publishedAt: "desc" };

    // --- Faceted counts ---
    // Each facet uses all filters EXCEPT its own dimension
    // Shared extra filters for new dimensions (applied to old facets too)
    const newDimFilters = {
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };
    const platformFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const cityFacetWhere = {
      ...baseWhere,
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const categoryFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const budgetTypeFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...newDimFilters,
    };
    const paymentModeFacetWhere = {
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(adFormatFilter && { adFormatId: adFormatFilter }),
      ...(adSubjectFilter && { adSubjectId: adSubjectFilter }),
    };
    // New dimension facets (each excludes its own filter, includes everything else)
    const allFiltersExceptDim = (exclude: string) => ({
      ...baseWhere,
      ...(cityFilter && { city: cityFilter }),
      ...(platformFilter && { platform: platformFilter }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(budgetTypeFilter && { budgetType: budgetTypeFilter }),
      ...(paymentModeFilter && { paymentMode: paymentModeFilter }),
      ...(exclude !== "videoFormat" && videoFormatFilter && { videoFormatId: videoFormatFilter }),
      ...(exclude !== "adFormat" && adFormatFilter && { adFormatId: adFormatFilter }),
      ...(exclude !== "adSubject" && adSubjectFilter && { adSubjectId: adSubjectFilter }),
    });
    const videoFormatFacetWhere = allFiltersExceptDim("videoFormat");
    const adFormatFacetWhere = allFiltersExceptDim("adFormat");
    const adSubjectFacetWhere = allFiltersExceptDim("adSubject");

    // --- Два запроса: бустнутые + обычные, распределённые по страницам ---
    const now = new Date();
    const boostedWhere = { ...where, boosts: { some: { expiresAt: { gt: now } } } };
    const regularWhere = { ...where, NOT: { boosts: { some: { expiresAt: { gt: now } } } } };

    const adInclude = {
      boosts: {
        where: { expiresAt: { gt: now } },
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
      videoFormat: { select: { id: true, key: true, label: true, icon: true } },
      adFormat: { select: { id: true, key: true, label: true, icon: true } },
      adSubject: { select: { id: true, key: true, label: true, icon: true } },
    };

    // Считаем total + totalBoosted + фасеты параллельно
    const [
      total, totalBoosted,
      platformCounts, cityCounts, categoryCounts, budgetTypeCounts, paymentModeCounts,
      videoFormatCounts, adFormatCounts, adSubjectCounts,
    ] = await Promise.all([
        prisma.ad.count({ where }),
        prisma.ad.count({ where: boostedWhere }),
        prisma.ad.groupBy({ by: ["platform"], where: platformFacetWhere, _count: true }),
        prisma.ad.groupBy({ by: ["city"], where: cityFacetWhere, _count: true }),
        prisma.ad.groupBy({ by: ["category"], where: categoryFacetWhere, _count: true }),
        prisma.ad.groupBy({ by: ["budgetType"], where: budgetTypeFacetWhere, _count: true }),
        prisma.ad.groupBy({ by: ["paymentMode"], where: paymentModeFacetWhere, _count: true }),
        prisma.ad.groupBy({ by: ["videoFormatId"], where: { ...videoFormatFacetWhere, videoFormatId: { not: null } }, _count: true }),
        prisma.ad.groupBy({ by: ["adFormatId"], where: { ...adFormatFacetWhere, adFormatId: { not: null } }, _count: true }),
        prisma.ad.groupBy({ by: ["adSubjectId"], where: { ...adSubjectFacetWhere, adSubjectId: { not: null } }, _count: true }),
      ]);

    // Рассчитываем слоты для бустнутых на каждую страницу (interleaved по тирам)
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Загружаем ВСЕ бустнутые (их немного) — нужны для распределения по тирам
    const allBoosted = totalBoosted > 0
      ? await prisma.ad.findMany({ where: boostedWhere, orderBy, include: adInclude })
      : [];

    // Per-visitor seed: разные посетители видят разный порядок бустов
    const visitorId = req.cookies.get("vw_vid")?.value;

    // Пропорциональное распределение: каждая страница получает микс Premium+VIP+Rise
    const boostedItems = distributeBoostedByTier(allBoosted, page, totalPages, visitorId);
    const boostedOnThisPage = boostedItems.length;
    const boostedBefore = countBoostedBeforePage(allBoosted, page, totalPages, visitorId);
    const regularTake = limit - boostedOnThisPage;
    const regularSkip = (page - 1) * limit - boostedBefore;

    const regularItems = await prisma.ad.findMany({
      where: regularWhere, orderBy, skip: Math.max(0, regularSkip), take: regularTake, include: adInclude,
    });

    const ads = [...boostedItems, ...regularItems];

    const facets = {
      platform: Object.fromEntries(platformCounts.map((r) => [r.platform, r._count])),
      city: Object.fromEntries(cityCounts.map((r) => [r.city, r._count])),
      category: Object.fromEntries(categoryCounts.map((r) => [r.category, r._count])),
      budgetType: Object.fromEntries(budgetTypeCounts.map((r) => [r.budgetType, r._count])),
      paymentMode: Object.fromEntries(paymentModeCounts.map((r) => [r.paymentMode, r._count])),
      videoFormat: Object.fromEntries(videoFormatCounts.map((r) => [r.videoFormatId!, r._count])),
      adFormat: Object.fromEntries(adFormatCounts.map((r) => [r.adFormatId!, r._count])),
      adSubject: Object.fromEntries(adSubjectCounts.map((r) => [r.adSubjectId!, r._count])),
    };

    return NextResponse.json({
      data: ads,
      pagination: { page, limit, total, totalPages },
      facets,
    });
  } catch (err) {
    console.error("[GET /api/ads]", err);
    return serverError();
  }
}

// POST /api/ads — создать объявление (требует авторизации)
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

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
      // Escrow fields
      paymentMode,
      rpm,
      minViews,
      maxViewsPerCreator,
      totalBudget,
      submissionDeadline,
      // New category dimensions
      videoFormatId,
      adFormatId,
      adSubjectId,
    } = body;

    // Валидация обязательных полей + enum + длины
    const validationError = validateAdFields(body);
    if (validationError) return badRequest(validationError);

    // Валидация эскроу-полей
    const isEscrow = paymentMode === "escrow";
    if (isEscrow) {
      if (!rpm || typeof rpm !== "number" || rpm < 50 || rpm > 10000) {
        return badRequest("RPM обязателен (от 50 до 10 000 ₸)");
      }
      if (!totalBudget || typeof totalBudget !== "number" || totalBudget < 1000) {
        return badRequest("Бюджет обязателен (минимум 1 000 ₸)");
      }
      if (!submissionDeadline) {
        return badRequest("Дедлайн подачи видео обязателен");
      }
      const deadline = new Date(submissionDeadline);
      if (isNaN(deadline.getTime()) || deadline <= new Date()) {
        return badRequest("Дедлайн подачи должен быть в будущем");
      }
      if (minViews !== undefined && minViews !== null) {
        if (typeof minViews !== "number" || minViews < 0) {
          return badRequest("Минимум просмотров должен быть положительным числом");
        }
      }
      if (maxViewsPerCreator !== undefined && maxViewsPerCreator !== null) {
        if (typeof maxViewsPerCreator !== "number" || maxViewsPerCreator < 0) {
          return badRequest("Максимум просмотров на креатора должен быть положительным числом");
        }
      }
    }

    // Валидация контактов (не обязательны для escrow)
    if (!isEscrow) {
      const contactsError = validateContacts(contacts);
      if (contactsError) return badRequest(contactsError);
    }

    // Валидация images
    if (images !== undefined) {
      if (!Array.isArray(images)) return badRequest("images должен быть массивом");
      if (images.length > 10) return badRequest("Максимум 10 фото");
    }

    // Validate new category dimension IDs (optional, check existence & active)
    if (videoFormatId) {
      const vf = await prisma.videoFormat.findUnique({ where: { id: videoFormatId }, select: { isActive: true } });
      if (!vf) return badRequest("Формат видео не найден");
      if (!vf.isActive) return badRequest("Формат видео деактивирован");
    }
    if (adFormatId) {
      const af = await prisma.adFormat.findUnique({ where: { id: adFormatId }, select: { isActive: true } });
      if (!af) return badRequest("Формат рекламы не найден");
      if (!af.isActive) return badRequest("Формат рекламы деактивирован");
    }
    if (adSubjectId) {
      const as_ = await prisma.adSubject.findUnique({ where: { id: adSubjectId }, select: { isActive: true } });
      if (!as_) return badRequest("Тип рекламируемого не найден");
      if (!as_.isActive) return badRequest("Тип рекламируемого деактивирован");
    }

    // Получаем данные компании из профиля рекламодателя
    const advertiserProfile = await prisma.advertiserProfile.findUnique({
      where: { userId },
      select: { companyName: true, displayName: true },
    });

    const ad = await prisma.ad.create({
      data: {
        ownerId: userId,
        companyName:
          advertiserProfile?.companyName ??
          advertiserProfile?.displayName ??
          null,
        title: title.trim(),
        description: description.trim(),
        platform,
        city: toDbCity(city) as any,
        category: toDbCategory(category) as any,
        budgetType,
        budgetFrom: budgetFrom ?? null,
        budgetTo: budgetTo ?? null,
        budgetDetails: isEscrow ? null : (budgetDetails ?? null),
        contactTelegram: contacts?.telegram ?? null,
        contactWhatsapp: contacts?.whatsapp ?? null,
        contactPhone: contacts?.phone ?? null,
        contactEmail: contacts?.email ?? null,
        images: images ?? [],
        status: "draft",
        // New category dimensions
        videoFormatId: videoFormatId || null,
        adFormatId: adFormatId || null,
        adSubjectId: adSubjectId || null,
        // Escrow fields
        paymentMode: isEscrow ? "escrow" : "direct",
        rpm: isEscrow ? rpm : null,
        minViews: isEscrow ? (minViews ?? 10000) : null,
        maxViewsPerCreator: isEscrow ? (maxViewsPerCreator ?? null) : null,
        totalBudget: isEscrow ? totalBudget : null,
        submissionDeadline: isEscrow ? new Date(submissionDeadline) : null,
      },
      include: {
        boosts: true,
        owner: {
          select: {
            id: true,
            name: true,
            advertiserProfile: {
              select: { companyName: true, displayName: true, verified: true },
            },
          },
        },
        videoFormat: { select: { id: true, key: true, label: true, icon: true } },
        adFormat: { select: { id: true, key: true, label: true, icon: true } },
        adSubject: { select: { id: true, key: true, label: true, icon: true } },
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (err) {
    console.error("[POST /api/ads]", err);
    return serverError();
  }
}
