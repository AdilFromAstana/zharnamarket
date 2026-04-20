/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from "cheerio";
import { BROWSER_HEADERS } from "./common";
import type { VideoMetaResult } from "./types";

type VkIds = { ownerId: string; videoId: string; kind: "video" | "clip" };

export function extractVkVideoId(url: string): VkIds | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host !== "vk.com" && host !== "vkvideo.ru" && host !== "vk.ru") {
      return null;
    }

    const parts = u.pathname.split("/").filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^(video|clip)(-?\d+)_(\d+)/);
      if (m) {
        return {
          kind: m[1] as "video" | "clip",
          ownerId: m[2],
          videoId: m[3],
        };
      }
    }

    // Query-string: vk.com/...?z=video-X_Y или ?z=clip-X_Y
    const z = u.searchParams.get("z");
    if (z) {
      const m = z.match(/(video|clip)(-?\d+)_(\d+)/);
      if (m) {
        return {
          kind: m[1] as "video" | "clip",
          ownerId: m[2],
          videoId: m[3],
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

// VK отвечает windows-1251 и редиректит на autologin при отсутствии cookie.
// _ignoreAutoLogin=1 говорит "не редиректь", и страница отдаётся анонимно.
const VK_HEADERS: Record<string, string> = {
  ...BROWSER_HEADERS,
  "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  cookie: "_ignoreAutoLogin=1",
};

async function fetchDecoded(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: VK_HEADERS,
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new TextDecoder("windows-1251").decode(buf);
  } catch {
    return null;
  }
}

function pickInt(html: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

type PageResult = {
  title: string | null;
  thumbnail: string | null;
  views: number | null;
  likes: number | null;
};

// Основной URL (vkvideo.ru/{kind}-X_Y).
// Для clip-* страница SSR'ится с og:-тегами и описанием, содержащим просмотры/лайки.
// Для video-* страница — SPA, og-тегов нет (фоллбек — embed).
function parseMainPage(html: string): PageResult {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $('meta[name="twitter:title"]').attr("content")?.trim() ||
    null;

  const thumbnail =
    $('meta[property="og:image:secure_url"]').attr("content")?.trim() ||
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('meta[name="twitter:image"]').attr("content")?.trim() ||
    null;

  // VK в meta description даёт статистику в формате "N — просмотрели. M — оценили."
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const views = pickInt(description, [
    /(\d+)\s*[—–-]\s*просмотрел/i,
    /(\d+)\s*просмотр/i,
  ]);
  const likes = pickInt(description, [
    /(\d+)\s*[—–-]\s*оценил/i,
    /(\d+)\s*лайк/i,
  ]);

  return { title, thumbnail, views, likes };
}

// Ищем лучший thumbnail в массиве кадров VK: {"url":"...userapi...?size=WxH"}.
// VK отдаёт 7-8 размеров (130x96 → 1280x720); берём 720p если есть, иначе max.
function pickBestEmbedThumbnail(html: string): string | null {
  const re =
    /"url"\s*:\s*"(https?:\\\/\\\/[^"]*userapi\.com\\\/[^"]*?type=video_thumb)"/g;
  const candidates: { url: string; height: number }[] = [];
  for (const m of html.matchAll(re)) {
    const url = m[1].replace(/\\\//g, "/");
    const sizeMatch = url.match(/[?&]size=\d+x(\d+)/);
    const height = sizeMatch ? Number(sizeMatch[1]) : 0;
    candidates.push({ url, height });
  }
  if (!candidates.length) return null;
  // Предпочитаем 720p; иначе — максимальный размер ≤ 720, иначе — максимум
  const under720 = candidates.filter((c) => c.height <= 720 && c.height > 0);
  const pool = under720.length ? under720 : candidates;
  pool.sort((a, b) => b.height - a.height);
  return pool[0]?.url ?? null;
}

// Embed-страница (vk.com/video_ext.php) — 70-80кб JSON-в-HTML с надёжными
// "views":N и "likes":{"count":N}. Не требует логина, не зависит от SPA.
function parseEmbedPage(html: string): PageResult {
  const views = pickInt(html, [
    /"views"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
    /"views"\s*:\s*(\d+)/,
  ]);
  const likes = pickInt(html, [
    /"likes"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
    /"likesCount"\s*:\s*(\d+)/,
  ]);
  const thumbnail = pickBestEmbedThumbnail(html);
  // md_title в embed-странице часто экранирован cp1251, поэтому не берём —
  // полагаемся на og:title c main-страницы (или юзер впишет вручную).
  return { title: null, thumbnail, views, likes };
}

async function viaScrape(ids: VkIds): Promise<VideoMetaResult> {
  const mainUrl = `https://vkvideo.ru/${ids.kind}${ids.ownerId}_${ids.videoId}`;
  const embedUrl = `https://vk.com/video_ext.php?oid=${ids.ownerId}&id=${ids.videoId}`;

  const [mainHtml, embedHtml] = await Promise.all([
    fetchDecoded(mainUrl),
    fetchDecoded(embedUrl),
  ]);

  const main: PageResult = mainHtml
    ? parseMainPage(mainHtml)
    : { title: null, thumbnail: null, views: null, likes: null };
  const embed: PageResult = embedHtml
    ? parseEmbedPage(embedHtml)
    : { title: null, thumbnail: null, views: null, likes: null };

  // Приоритет: embed для чисел (надёжнее), main для title/thumbnail
  const title = main.title ?? embed.title;
  const thumbnail = main.thumbnail ?? embed.thumbnail;
  const views = embed.views ?? main.views;
  const likes = embed.likes ?? main.likes;

  if (!title && !thumbnail && views === null) {
    return { ok: false, error: "Could not extract VK video metadata" };
  }

  const source =
    mainHtml && embedHtml
      ? "vk-main+embed"
      : mainHtml
        ? "vk-main"
        : "vk-embed";

  return {
    ok: true,
    platform: "VK",
    videoId: `${ids.ownerId}_${ids.videoId}`,
    title,
    views,
    likes,
    thumbnail,
    source,
  };
}

export async function scrapeVkVideo(url: string): Promise<VideoMetaResult> {
  const ids = extractVkVideoId(url);
  if (!ids) {
    return { ok: false, error: "Could not extract VK video ID from URL" };
  }
  return viaScrape(ids);
}
