/**
 * Утилиты валидации для API routes.
 * Используется в create/update handlers для tasks, creators, users.
 */

import { Platform } from "@prisma/client";

// ─── Допустимые значения enum (из prisma/schema.prisma) ───────────────────

export const VALID_PLATFORMS: Set<string> = new Set(Object.values(Platform));

// NOTE: VALID_CATEGORIES and VALID_CITIES removed - now validated against database

export const VALID_BUDGET_TYPES = new Set([
  "fixed",
  "per_views",
  "revenue",
  "negotiable",
]);

export const VALID_AVAILABILITY = new Set([
  "available",
  "busy",
  "partially_available",
]);

export const VALID_AD_STATUSES = new Set([
  "active",
  "paused",
  "expired",
  "archived",
  "draft",
  "pending_payment",
  "deleted",
  "budget_exhausted",
  "cancelled",
]);

export const VALID_PAYMENT_METHODS = new Set(["kaspi", "halyk", "card"]);

export const VALID_BOOST_TYPES = new Set(["rise", "vip", "premium"]);

// ─── Безопасный parseInt / parseFloat ──────────────────────────────────────

/** Парсит строку в int, возвращает defaultValue при NaN или null input */
export function safeInt(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const n = parseInt(value, 10);
  return isNaN(n) ? defaultValue : n;
}

/** Парсит строку в float, возвращает null при NaN */
export function safeFloat(value: string | null): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// ─── Валидаторы ────────────────────────────────────────────────────────────

/** Проверяет что значение входит в допустимый Set */
export function isValidEnum(value: string, validSet: Set<string>): boolean {
  return validSet.has(value);
}

/** Проверяет что значение входит в массив допустимых значений */
export function isValidFromArray(value: string, validArray: string[]): boolean {
  return validArray.includes(value);
}

/** Проверяет формат email (базовая проверка) */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Проверяет что URL валиден (http/https) */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Лимиты длины строк ──────────────────────────────────────────────────

export const LIMITS = {
  title: { min: 3, max: 200 },
  description: { min: 10, max: 5000 },
  name: { min: 1, max: 100 },
  bio: { min: 0, max: 2000 },
  companyName: { min: 0, max: 200 },
  website: { min: 0, max: 500 },
  contactField: { min: 0, max: 200 },
  budgetDetails: { min: 0, max: 1000 },
  password: { min: 8, max: 128 },
  username: { min: 0, max: 100 },
} as const;

/** Проверяет длину строки. Возвращает текст ошибки или null */
export function checkLength(
  value: string | null | undefined,
  fieldName: string,
  min: number,
  max: number,
): string | null {
  if (!value) {
    return min > 0 ? `${fieldName} обязательно` : null;
  }
  if (value.length < min) return `${fieldName}: минимум ${min} символов`;
  if (value.length > max) return `${fieldName}: максимум ${max} символов`;
  return null;
}

// ─── Валидация категорийных справочников ───────────────────────────────────

/** Проверяет ключ справочника: только латиница, цифры, 2-50 символов */
export function validateCategoryKey(key: string): string | null {
  if (!key || typeof key !== "string") return "Ключ обязателен";
  if (key.length < 2 || key.length > 50) return "Ключ: от 2 до 50 символов";
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key))
    return "Ключ: только латиница и цифры, начинается с буквы";
  return null;
}

/** Проверяет label справочника: 2-100 символов */
export function validateCategoryLabel(label: string): string | null {
  if (!label || typeof label !== "string" || !label.trim())
    return "Название обязательно";
  if (label.trim().length < 2 || label.trim().length > 100)
    return "Название: от 2 до 100 символов";
  return null;
}

// ─── Валидация объявления (Ad) ────────────────────────────────────────────

export function validateAdFields(body: Record<string, unknown>): string | null {
  const {
    title,
    platform,
    city,
    category,
    budgetType,
    description,
    budgetFrom,
    budgetTo,
    budgetDetails,
  } = body;

  // Обязательные поля
  if (!title || typeof title !== "string" || !title.trim())
    return "Название обязательно";
  const titleErr = checkLength(
    String(title).trim(),
    "Название",
    LIMITS.title.min,
    LIMITS.title.max,
  );
  if (titleErr) return titleErr;

  if (!platform || !isValidEnum(String(platform), VALID_PLATFORMS)) {
    return `Недопустимая платформа. Допустимые: ${[...VALID_PLATFORMS].join(", ")}`;
  }
  if (!city) return "Город обязателен";
  // city может быть русским (маппится через toDbCity) или enum-ключом
  // Проверяем после маппинга в route handler

  if (!category) return "Категория обязательна";
  // category аналогично маппится

  if (!description || typeof description !== "string" || !description.trim())
    return "Описание обязательно";
  const descErr = checkLength(
    String(description).trim(),
    "Описание",
    LIMITS.description.min,
    LIMITS.description.max,
  );
  if (descErr) return descErr;

  if (!budgetType || !isValidEnum(String(budgetType), VALID_BUDGET_TYPES)) {
    return "Недопустимый тип бюджета. Допустимые: fixed, per_views, revenue, negotiable";
  }

  // Числовые поля (опциональные)
  if (budgetFrom !== undefined && budgetFrom !== null) {
    if (typeof budgetFrom !== "number" || isNaN(budgetFrom) || budgetFrom < 0) {
      return "Бюджет (от) должен быть положительным числом";
    }
  }
  if (budgetTo !== undefined && budgetTo !== null) {
    if (typeof budgetTo !== "number" || isNaN(budgetTo) || budgetTo < 0) {
      return "Бюджет (до) должен быть положительным числом";
    }
  }
  if (budgetDetails !== undefined && budgetDetails !== null) {
    const bdErr = checkLength(
      String(budgetDetails),
      "Детали бюджета",
      0,
      LIMITS.budgetDetails.max,
    );
    if (bdErr) return bdErr;
  }

  return null;
}

// ─── Валидация PATCH полей объявления ─────────────────────────────────────

export function validateAdPatchField(
  field: string,
  value: unknown,
): string | null {
  switch (field) {
    case "title":
      if (typeof value !== "string" || !value.trim())
        return "Название не может быть пустым";
      return checkLength(
        value.trim(),
        "Название",
        LIMITS.title.min,
        LIMITS.title.max,
      );
    case "description":
      if (typeof value !== "string" || !value.trim())
        return "Описание не может быть пустым";
      return checkLength(
        value.trim(),
        "Описание",
        LIMITS.description.min,
        LIMITS.description.max,
      );
    case "platform":
      if (!isValidEnum(String(value), VALID_PLATFORMS))
        return "Недопустимая платформа";
      break;
    case "budgetType":
      if (!isValidEnum(String(value), VALID_BUDGET_TYPES))
        return "Недопустимый тип бюджета";
      break;
    case "budgetFrom":
    case "budgetTo":
      if (
        value !== null &&
        (typeof value !== "number" || isNaN(value) || value < 0)
      ) {
        return `${field} должен быть положительным числом`;
      }
      break;
    case "budgetDetails":
      if (value !== null && typeof value === "string") {
        return checkLength(
          value,
          "Детали бюджета",
          0,
          LIMITS.budgetDetails.max,
        );
      }
      break;
    case "images":
      if (!Array.isArray(value)) return "images должен быть массивом";
      if (value.length > 10) return "Максимум 10 фото";
      break;
    // city, category — маппятся, проверяем отдельно
  }
  return null;
}

// ─── Валидация контактов ──────────────────────────────────────────────────

export function validateContacts(
  contacts: Record<string, unknown> | undefined,
): string | null {
  if (!contacts) return null;
  for (const [key, value] of Object.entries(contacts)) {
    if (value !== null && value !== undefined && typeof value === "string") {
      const err = checkLength(
        value,
        `Контакт (${key})`,
        0,
        LIMITS.contactField.max,
      );
      if (err) return err;
    }
  }
  return null;
}
