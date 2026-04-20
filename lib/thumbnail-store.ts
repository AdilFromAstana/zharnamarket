import path from "path";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";

const PORTFOLIO_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "portfolio",
);

const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024;

/**
 * Зеркалим любой внешний (не наш) тамбнейл: tiktok/ig — из-за подписанных
 * протухающих URL, ok.ru/vk — из-за CSP, youtube — ради single origin.
 * Одним правилом покрываем все текущие и будущие платформы.
 */
export function isEphemeralThumbnail(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return false; // уже локальный путь
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function extFromContentType(ct: string): string | null {
  const lower = ct.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("gif")) return "gif";
  return null;
}

export async function downloadThumbnail(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const ext = extFromContentType(contentType);
    if (!ext) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_THUMBNAIL_BYTES) return null;
    await mkdir(PORTFOLIO_DIR, { recursive: true });
    const name = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${ext}`;
    await writeFile(path.join(PORTFOLIO_DIR, name), buf);
    return `/uploads/portfolio/${name}`;
  } catch (err) {
    console.error("[downloadThumbnail]", url, err);
    return null;
  }
}

/**
 * Если URL с «протухающего» хоста (TikTok/Instagram CDN) — скачивает
 * картинку в public/uploads/portfolio/ и возвращает локальный путь.
 * Иначе возвращает исходный URL без изменений.
 * При ошибке скачивания возвращает исходный URL (fallback).
 */
export async function persistThumbnailIfEphemeral(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  if (!isEphemeralThumbnail(url)) return url;
  const local = await downloadThumbnail(url);
  return local ?? url;
}
