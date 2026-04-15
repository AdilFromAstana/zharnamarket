import { NextRequest, NextResponse } from 'next/server';
import { scrapeTikTok } from '@/lib/scrapers/tiktok';
import { scrapeYouTube } from '@/lib/scrapers/youtube';
import { scrapeInstagram } from '@/lib/scrapers/instagram';
import type { FollowersResult } from '@/lib/scrapers/types';

type ScrapeFn = (handle: string) => Promise<FollowersResult>;

const handlers: Record<string, ScrapeFn> = {
  TikTok: scrapeTikTok,
  YouTube: scrapeYouTube,
  Instagram: scrapeInstagram,
};

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform') ?? '';
  const input =
    req.nextUrl.searchParams.get('url') ??
    req.nextUrl.searchParams.get('handle') ??
    '';

  if (!input.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Missing "url" query parameter' },
      { status: 400 },
    );
  }

  const fn = handlers[platform];
  if (!fn) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported platform "${platform}". Supported: ${Object.keys(handlers).join(', ')}`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await fn(input);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Scraper threw: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
