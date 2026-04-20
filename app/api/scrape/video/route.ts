import { NextRequest, NextResponse } from "next/server";
import { scrapeYouTubeVideo } from "@/lib/scrapers/video-youtube";
import { scrapeTikTokVideo } from "@/lib/scrapers/video-tiktok";
import { scrapeVkVideo } from "@/lib/scrapers/video-vk";
import type { VideoMetaResult } from "@/lib/scrapers/types";

type SupportedPlatform = "YouTube" | "TikTok" | "VK";

function detectPlatform(
  url: string,
): SupportedPlatform | "Instagram" | null {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("vkvideo.ru") || u.includes("vk.com") || u.includes("vk.ru")) {
    return "VK";
  }
  if (u.includes("instagram.com")) return "Instagram";
  return null;
}

const scrapers: Record<
  SupportedPlatform,
  (url: string) => Promise<VideoMetaResult>
> = {
  YouTube: scrapeYouTubeVideo,
  TikTok: scrapeTikTokVideo,
  VK: scrapeVkVideo,
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  if (!url.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Missing "url" query parameter' },
      { status: 400 },
    );
  }

  const platform = detectPlatform(url);
  const scraper = platform && platform !== "Instagram" ? scrapers[platform] : null;
  if (!scraper) {
    return NextResponse.json(
      {
        ok: false,
        error: platform
          ? `Platform "${platform}" is not supported yet. Supported: YouTube, TikTok, VK`
          : "Could not detect platform from URL. Supported: YouTube, TikTok, VK",
      },
      { status: 400 },
    );
  }

  try {
    const result: VideoMetaResult = await scraper(url);
    // НЕ скачиваем превью на диск здесь, иначе при удалении ссылки пользователем
    // до сохранения формы на сервере копятся orphan-файлы. Внешний URL
    // отображается через /api/img-proxy (обход CSP), а при сохранении креатора
    // бэкенд (POST/PATCH /api/creators) зеркалит URL в /uploads/portfolio/.
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Scraper threw: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
