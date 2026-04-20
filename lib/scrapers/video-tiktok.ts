/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from "cheerio";
import { BROWSER_HEADERS } from "./common";
import type { VideoMetaResult } from "./types";

export function extractTikTokVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.endsWith("tiktok.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const videoIdx = parts.indexOf("video");
    if (videoIdx >= 0 && parts[videoIdx + 1]) {
      const id = parts[videoIdx + 1];
      return /^\d{6,}$/.test(id) ? id : null;
    }
    if (parts[0] === "v" && parts[1]) {
      const id = parts[1].replace(/\.html$/, "");
      return /^\d{6,}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

type OEmbedResult = {
  title: string | null;
  thumbnail: string | null;
  author: string | null;
};

async function viaOEmbed(videoUrl: string): Promise<OEmbedResult | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const res = await fetch(oembedUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const json: any = await res.json();
    return {
      title: json?.title ?? null,
      thumbnail: json?.thumbnail_url ?? null,
      author: json?.author_unique_id ?? null,
    };
  } catch {
    return null;
  }
}

type PageScrapeResult = {
  title: string | null;
  thumbnail: string | null;
  views: number | null;
  likes: number | null;
};

function findItemStruct(node: any): any | null {
  if (!node || typeof node !== "object") return null;
  if (node.itemInfo?.itemStruct) return node.itemInfo.itemStruct;
  for (const key of Object.keys(node)) {
    const found = findItemStruct(node[key]);
    if (found) return found;
  }
  return null;
}

async function viaScrape(videoUrl: string): Promise<PageScrapeResult | null> {
  try {
    const res = await fetch(videoUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const universalRaw = $("#__UNIVERSAL_DATA_FOR_REHYDRATION__").html();
    if (universalRaw) {
      try {
        const parsed = JSON.parse(universalRaw);
        const item = findItemStruct(parsed);
        if (item) {
          const views = Number(item.stats?.playCount ?? item.statsV2?.playCount ?? 0);
          const likes = Number(item.stats?.diggCount ?? item.statsV2?.diggCount ?? 0);
          const title: string | null = item.desc ?? null;
          const thumbnail: string | null =
            item.video?.cover ??
            item.video?.originCover ??
            item.video?.dynamicCover ??
            null;
          return {
            title,
            thumbnail,
            views: Number.isFinite(views) && views > 0 ? views : null,
            likes: Number.isFinite(likes) && likes > 0 ? likes : null,
          };
        }
      } catch {}
    }

    // Fallback: regex sweep for stats in inline JSON
    const playCountMatch = html.match(/"playCount":(\d+)/);
    const diggCountMatch = html.match(/"diggCount":(\d+)/);
    const descMatch = html.match(/"desc":"([^"\\]*(?:\\.[^"\\]*)*)"/);
    const coverMatch = html.match(/"cover":"([^"\\]*(?:\\.[^"\\]*)*)"/);
    if (playCountMatch || descMatch || coverMatch || diggCountMatch) {
      return {
        title: descMatch ? JSON.parse(`"${descMatch[1]}"`) : null,
        thumbnail: coverMatch ? JSON.parse(`"${coverMatch[1]}"`) : null,
        views: playCountMatch ? Number(playCountMatch[1]) : null,
        likes: diggCountMatch ? Number(diggCountMatch[1]) : null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function scrapeTikTokVideo(
  url: string,
): Promise<VideoMetaResult> {
  const videoId = extractTikTokVideoId(url);
  if (!videoId) {
    return { ok: false, error: "Could not extract TikTok video ID from URL" };
  }

  const [oembed, scrape] = await Promise.all([
    viaOEmbed(url),
    viaScrape(url),
  ]);

  const title = oembed?.title ?? scrape?.title ?? null;
  const thumbnail = oembed?.thumbnail ?? scrape?.thumbnail ?? null;
  const views = scrape?.views ?? null;
  const likes = scrape?.likes ?? null;

  if (!title && !thumbnail && views === null) {
    return { ok: false, error: "Could not extract TikTok video metadata" };
  }

  const source =
    oembed && scrape
      ? "tiktok-oembed+scrape"
      : oembed
        ? "tiktok-oembed"
        : "tiktok-scrape";

  return {
    ok: true,
    platform: "TikTok",
    videoId,
    title,
    views,
    likes,
    thumbnail,
    source,
  };
}
