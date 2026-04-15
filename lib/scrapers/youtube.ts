/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from 'cheerio';
import { BROWSER_HEADERS, normalizeHandle, parseAbbrevNumber } from './common';
import type { FollowersResult } from './types';

async function viaApi(handle: string, apiKey: string): Promise<FollowersResult | null> {
  const url =
    `https://www.googleapis.com/youtube/v3/channels` +
    `?part=statistics,snippet&forHandle=@${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const json: any = await res.json();
  const item = json?.items?.[0];
  if (!item) return null;

  const subs = Number(item.statistics?.subscriberCount ?? 0);
  if (!Number.isFinite(subs)) return null;

  return {
    ok: true,
    username: item.snippet?.customUrl?.replace(/^@/, '') ?? handle,
    followers: subs,
    source: 'youtube-api-v3',
  };
}

// Dig for any object with key `subscriberCountText` inside ytInitialData.
function findSubscriberCountText(node: any): string | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.subscriberCountText === 'object' && node.subscriberCountText) {
    const t = node.subscriberCountText;
    if (typeof t.simpleText === 'string') return t.simpleText;
    if (Array.isArray(t.runs) && typeof t.runs[0]?.text === 'string') return t.runs[0].text;
    if (typeof t.content === 'string') return t.content;
  }
  if (typeof node.metadataParts !== 'undefined' && Array.isArray(node.metadataParts)) {
    for (const part of node.metadataParts) {
      const txt = part?.text?.content;
      if (typeof txt === 'string' && /subscribers?/i.test(txt)) return txt;
    }
  }
  for (const key of Object.keys(node)) {
    const found = findSubscriberCountText(node[key]);
    if (found) return found;
  }
  return null;
}

function parseSubText(text: string): number | null {
  // Examples: "312M subscribers", "1.2K subscribers", "532 subscribers"
  const m = text.match(/([\d.,]+[KMB]?)\s*subscribers?/i);
  if (!m) return null;
  return parseAbbrevNumber(m[1]);
}

async function viaScrape(handle: string): Promise<FollowersResult> {
  const url = `https://www.youtube.com/@${encodeURIComponent(handle)}`;
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!res.ok) {
    return { ok: false, error: `YouTube HTTP ${res.status}` };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let initialDataRaw: string | null = null;
  $('script').each((_, el) => {
    const txt = $(el).html() ?? '';
    const m = txt.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|$)/);
    if (m) {
      initialDataRaw = m[1];
      return false;
    }
  });

  if (initialDataRaw) {
    try {
      const parsed = JSON.parse(initialDataRaw);
      const text = findSubscriberCountText(parsed);
      if (text) {
        const n = parseSubText(text);
        if (n !== null) {
          return {
            ok: true,
            username: handle,
            followers: n,
            source: 'youtube-ytInitialData',
          };
        }
      }
    } catch {}
  }

  // Last resort: regex over visible text
  const pageText = $('body').text();
  const m = pageText.match(/([\d.,]+[KMB]?)\s*subscribers?/i);
  if (m) {
    const n = parseAbbrevNumber(m[1]);
    if (n !== null) {
      return { ok: true, username: handle, followers: n, source: 'youtube-visible' };
    }
  }

  return {
    ok: false,
    error: 'Could not extract YouTube subscriber count.',
  };
}

export async function scrapeYouTube(rawHandle: string): Promise<FollowersResult> {
  const clean = normalizeHandle(rawHandle);
  if (!clean) return { ok: false, error: 'Handle is required' };

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    const apiResult = await viaApi(clean, apiKey);
    if (apiResult) return apiResult;
  }

  return viaScrape(clean);
}
