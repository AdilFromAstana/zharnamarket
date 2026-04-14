/**
 * Shared CRUD logic for admin category management.
 * Used by video-formats, ad-formats, ad-subjects admin routes.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, badRequest, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCategoryKey, validateCategoryLabel, safeInt } from "@/lib/validation";

// Prisma delegate type (works for videoFormat, adFormat, adSubject)
type CategoryDelegate = typeof prisma.videoFormat | typeof prisma.adFormat | typeof prisma.adSubject;

// Map of model name → Prisma delegate + relation count field
const DELEGATES = {
  videoFormat: {
    delegate: () => prisma.videoFormat,
    countFields: { ads: true, creatorProfiles: true, portfolioItems: true },
    label: "Формат видео",
  },
  adFormat: {
    delegate: () => prisma.adFormat,
    countFields: { ads: true },
    label: "Формат рекламы",
  },
  adSubject: {
    delegate: () => prisma.adSubject,
    countFields: { ads: true },
    label: "Тип рекламируемого",
  },
} as const;

export type CategoryModelName = keyof typeof DELEGATES;

// ─── GET list ─────────────────────────────────────────────────────────────────

export async function handleCategoryList(req: NextRequest, model: CategoryModelName) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() || "";
    const isActive = sp.get("isActive");
    const page = safeInt(sp.get("page"), 1);
    const limit = safeInt(sp.get("limit"), 50);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { key: { contains: search, mode: "insensitive" } },
        { label: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const conf = DELEGATES[model];
    const delegate = conf.delegate() as any;

    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit,
        include: { _count: { select: conf.countFields } },
      }),
      delegate.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(`[GET /api/admin/${model}s]`, err);
    return serverError();
  }
}

// ─── POST create ──────────────────────────────────────────────────────────────

export async function handleCategoryCreate(req: NextRequest, model: CategoryModelName) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { key, label, description, icon, sortOrder } = body as {
      key?: string;
      label?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
    };

    // Validation
    const keyErr = validateCategoryKey(key ?? "");
    if (keyErr) return badRequest(keyErr);

    const labelErr = validateCategoryLabel(label ?? "");
    if (labelErr) return badRequest(labelErr);

    if (description && typeof description === "string" && description.length > 500) {
      return badRequest("Описание: максимум 500 символов");
    }

    if (icon && typeof icon === "string" && icon.length > 10) {
      return badRequest("Иконка: максимум 10 символов");
    }

    const conf = DELEGATES[model];
    const delegate = conf.delegate() as any;

    // Check uniqueness
    const existing = await delegate.findUnique({ where: { key: key!.trim() } });
    if (existing) return badRequest(`${conf.label} с ключом '${key}' уже существует`);

    const item = await delegate.create({
      data: {
        key: key!.trim(),
        label: label!.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        sortOrder: typeof sortOrder === "number" && sortOrder >= 0 ? sortOrder : 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error(`[POST /api/admin/${model}s]`, err);
    return serverError();
  }
}

// ─── GET by id ────────────────────────────────────────────────────────────────

export async function handleCategoryGetById(req: NextRequest, id: string, model: CategoryModelName) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const conf = DELEGATES[model];
    const delegate = conf.delegate() as any;

    const item = await delegate.findUnique({
      where: { id },
      include: { _count: { select: conf.countFields } },
    });

    if (!item) return notFound(`${conf.label} не найден`);
    return NextResponse.json(item);
  } catch (err) {
    console.error(`[GET /api/admin/${model}s/${id}]`, err);
    return serverError();
  }
}

// ─── PATCH update ─────────────────────────────────────────────────────────────

export async function handleCategoryUpdate(req: NextRequest, id: string, model: CategoryModelName) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const conf = DELEGATES[model];
    const delegate = conf.delegate() as any;

    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) return notFound(`${conf.label} не найден`);

    const body = await req.json();
    const { key, label, description, icon, isActive, sortOrder } = body as {
      key?: string;
      label?: string;
      description?: string | null;
      icon?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    };

    const data: Record<string, unknown> = {};

    if (key !== undefined) {
      const keyErr = validateCategoryKey(key);
      if (keyErr) return badRequest(keyErr);
      // Check uniqueness (excluding self)
      const dup = await delegate.findFirst({
        where: { key: key.trim(), id: { not: id } },
      });
      if (dup) return badRequest(`${conf.label} с ключом '${key}' уже существует`);
      data.key = key.trim();
    }

    if (label !== undefined) {
      const labelErr = validateCategoryLabel(label);
      if (labelErr) return badRequest(labelErr);
      data.label = label.trim();
    }

    if (description !== undefined) {
      if (description !== null && typeof description === "string" && description.length > 500) {
        return badRequest("Описание: максимум 500 символов");
      }
      data.description = description?.trim() || null;
    }

    if (icon !== undefined) {
      data.icon = icon?.trim() || null;
    }

    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }

    if (typeof sortOrder === "number" && sortOrder >= 0) {
      data.sortOrder = sortOrder;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("Нет полей для обновления");
    }

    const updated = await delegate.update({
      where: { id },
      data,
      include: { _count: { select: conf.countFields } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/admin/${model}s/${id}]`, err);
    return serverError();
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function handleCategoryDelete(req: NextRequest, id: string, model: CategoryModelName) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const conf = DELEGATES[model];
    const delegate = conf.delegate() as any;

    const existing = await delegate.findUnique({
      where: { id },
      include: { _count: { select: conf.countFields } },
    });

    if (!existing) return notFound(`${conf.label} не найден`);

    // Check usage
    const totalUsage = Object.values(existing._count as Record<string, number>).reduce((sum, c) => sum + c, 0);
    if (totalUsage > 0) {
      return NextResponse.json(
        { error: `Невозможно удалить: ${conf.label.toLowerCase()} используется в ${totalUsage} записях. Деактивируйте вместо удаления.` },
        { status: 409 },
      );
    }

    await delegate.delete({ where: { id } });
    return NextResponse.json({ message: `${conf.label} удалён` });
  } catch (err) {
    console.error(`[DELETE /api/admin/${model}s/${id}]`, err);
    return serverError();
  }
}
