import * as cheerio from 'cheerio';
import { BROWSER_HEADERS, normalizeHandle, parseAbbrevNumber } from './common';
import type { FollowersResult } from './types';

export async function scrapeInstagram(rawHandle: string): Promise<FollowersResult> {
  const clean = normalizeHandle(rawHandle);
  if (!clean) return { ok: false, error: 'Handle is required' };

  const url = `https://www.instagram.com/${encodeURIComponent(clean)}/`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      cache: 'no-store',
    });
  } catch (err) {
    return {
      ok: false,
      error: `Instagram fetch failed: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    return { ok: false, error: `Instagram HTTP ${res.status}` };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const og =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  // Typical og:description:
  //   "1,234 Followers, 567 Following, 89 Posts - See Instagram photos and videos from ..."
  const m = og.match(/([\d.,KMB\s]+)\s+Followers/i);
  if (m) {
    const n = parseAbbrevNumber(m[1]);
    if (n !== null) {
      return {
        ok: true,
        username: clean,
        followers: n,
        source: 'instagram-og',
      };
    }
  }

  return {
    ok: false,
    error:
      'Instagram did not return follower data (likely blocked or login wall). ' +
      'Consider entering the count manually.',
  };
}
