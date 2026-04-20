/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from "cheerio";
import { BROWSER_HEADERS } from "./common";
import { extractYouTubeVideoId, getYouTubeThumbnail } from "../video-thumbnail";
import type { VideoMetaResult } from "./types";

async function viaApi(
  videoId: string,
  apiKey: string,
): Promise<VideoMetaResult | null> {
  const url =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,statistics&id=${encodeURIComponent(videoId)}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json: any = await res.json();
  const item = json?.items?.[0];
  if (!item) return null;

  const views = Number(item.statistics?.viewCount ?? 0);
  const likesRaw = item.statistics?.likeCount;
  const likes =
    likesRaw !== undefined && likesRaw !== null ? Number(likesRaw) : null;
  const thumbs = item.snippet?.thumbnails ?? {};
  const thumbnail: string | null =
    thumbs.maxres?.url ??
    thumbs.standard?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    getYouTubeThumbnail(`https://www.youtube.com/watch?v=${videoId}`);

  return {
    ok: true,
    platform: "YouTube",
    videoId,
    title: item.snippet?.title ?? null,
    views: Number.isFinite(views) ? views : null,
    likes: Number.isFinite(likes as number) ? (likes as number) : null,
    thumbnail,
    source: "youtube-api-v3",
  };
}

function extractPlayerResponse(html: string): any | null {
  const $ = cheerio.load(html);
  let raw: string | null = null;
  $("script").each((_, el) => {
    const txt = $(el).html() ?? "";
    const m = txt.match(
      /var ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>|$)/,
    );
    if (m) {
      raw = m[1];
      return false;
    }
  });
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function viaScrape(videoId: string): Promise<VideoMetaResult> {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false, error: `YouTube HTTP ${res.status}` };
  }
  const html = await res.text();
  const player = extractPlayerResponse(html);
  const details = player?.videoDetails ?? null;

  const title: string | null = details?.title ?? null;
  const viewsRaw = details?.viewCount;
  const views =
    viewsRaw !== undefined && viewsRaw !== null ? Number(viewsRaw) : null;
  const thumbs: Array<{ url?: string; width?: number }> =
    details?.thumbnail?.thumbnails ?? [];
  const best = thumbs.length
    ? thumbs.reduce((a, b) => ((a.width ?? 0) >= (b.width ?? 0) ? a : b))
    : null;
  const thumbnail: string | null =
    best?.url ?? getYouTubeThumbnail(url) ?? null;

  // Лайки не в videoDetails — ищем в ytInitialData через regex сразу по HTML
  let likes: number | null = null;
  const likeMatch = html.match(/"likeCount":"(\d+)"/);
  if (likeMatch) {
    const n = Number(likeMatch[1]);
    if (Number.isFinite(n)) likes = n;
  }

  if (!title && views === null) {
    return { ok: false, error: "Could not extract YouTube video metadata" };
  }

  return {
    ok: true,
    platform: "YouTube",
    videoId,
    title,
    views: Number.isFinite(views as number) ? (views as number) : null,
    likes,
    thumbnail,
    source: "youtube-player-response",
  };
}

export async function scrapeYouTubeVideo(
  url: string,
): Promise<VideoMetaResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return { ok: false, error: "Could not extract YouTube video ID from URL" };
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    const apiResult = await viaApi(videoId, apiKey);
    if (apiResult) return apiResult;
  }

  return viaScrape(videoId);
}
