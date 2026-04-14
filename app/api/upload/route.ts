import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Лимиты по типу загрузки
const UPLOAD_CONFIG = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5 МБ
    types: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  ad: {
    maxSize: 10 * 1024 * 1024, // 10 МБ
    types: ["image/jpeg", "image/png", "image/webp"],
  },
  portfolio: {
    maxSize: 10 * 1024 * 1024, // 10 МБ
    types: ["image/jpeg", "image/png", "image/webp"],
  },
  screenshot: {
    maxSize: 10 * 1024 * 1024, // 10 МБ
    types: ["image/jpeg", "image/png"],
  },
} as const;

type UploadType = keyof typeof UPLOAD_CONFIG;

/**
 * POST /api/upload — загрузить файл.
 *
 * Принимает multipart/form-data:
 *   - file: File (обязательно)
 *   - type: "avatar" | "ad" | "portfolio" (обязательно)
 *
 * Возвращает: { url: "/uploads/{type}/{filename}" }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) return unauthorized();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadType = formData.get("type") as string | null;

    if (!file) return badRequest("Файл обязателен");
    if (!uploadType || !(uploadType in UPLOAD_CONFIG)) {
      return badRequest("Тип загрузки обязателен: avatar, ad, portfolio, screenshot");
    }

    const config = UPLOAD_CONFIG[uploadType as UploadType];

    // Валидация типа файла
    if (!(config.types as readonly string[]).includes(file.type)) {
      const allowed = config.types.map((t) => t.split("/")[1]).join(", ");
      return badRequest(`Допустимые форматы: ${allowed}`);
    }

    // Валидация размера
    if (file.size > config.maxSize) {
      const maxMb = config.maxSize / (1024 * 1024);
      return badRequest(`Максимальный размер файла: ${maxMb} МБ`);
    }

    // Генерация уникального имени файла
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
    const filename = `${userId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${safeExt}`;
    const subdir = path.join(UPLOAD_DIR, uploadType);

    // Создаём поддиректорию если не существует
    await mkdir(subdir, { recursive: true });
    const filepath = path.join(subdir, filename);

    // Сохраняем файл
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/${uploadType}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return serverError();
  }
}
