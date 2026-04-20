import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { uploadLimiter, rateLimitGuard } from "@/lib/rate-limit";
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
 * Проверяет magic bytes файла, чтобы нельзя было подсунуть, например,
 * переименованный .exe с MIME-type image/jpeg.
 */
function detectImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF87a или GIF89a
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

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

    const limited = rateLimitGuard(
      uploadLimiter,
      `upload:${userId}`,
      3600,
      "Превышен лимит загрузок. Попробуйте через час.",
    );
    if (limited) return limited;

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

    // Читаем файл в память, чтобы проверить magic bytes до записи на диск
    const buffer = Buffer.from(await file.arrayBuffer());

    // Проверка реального формата: MIME-type из заголовка доверять нельзя —
    // атакующий мог переименовать исполняемый файл.
    const actualMime = detectImageMime(buffer);
    if (!actualMime || !(config.types as readonly string[]).includes(actualMime)) {
      return badRequest("Файл не является поддерживаемым изображением");
    }

    // Расширение берём из реального формата, а не из имени файла
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const safeExt = mimeToExt[actualMime];
    const filename = `${userId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${safeExt}`;
    const subdir = path.join(UPLOAD_DIR, uploadType);

    // Создаём поддиректорию если не существует
    await mkdir(subdir, { recursive: true });
    const filepath = path.join(subdir, filename);

    await writeFile(filepath, buffer);

    const url = `/uploads/${uploadType}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return serverError();
  }
}
