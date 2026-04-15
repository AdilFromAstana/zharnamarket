/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from 'cheerio';
import { BROWSER_HEADERS, normalizeHandle, parseAbbrevNumber } from './common';
import type { FollowersResult } from './types';

function extractFromUniversalData(json: unknown): FollowersResult | null {
  const j = json as Record<string, any>;
  const scoped = j?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;
  if (scoped?.user && scoped?.stats) {
    return {
      ok: true,
      username: scoped.user.uniqueId,
      followers: Number(scoped.stats.followerCount ?? 0),
      following: Number(scoped.stats.followingCount ?? 0),
      likes: Number(scoped.stats.heartCount ?? 0),
      source: '__UNIVERSAL_DATA_FOR_REHYDRATION__',
    };
  }
  return null;
}

function extractFromSigiState(json: unknown): FollowersResult | null {
  const j = json as Record<string, any>;
  const users = j?.UserModule?.users;
  const stats = j?.UserModule?.stats;
  if (!users || typeof users !== 'object') return null;

  const firstUserKey = Object.keys(users)[0];
  if (!firstUserKey) return null;

  const user = users[firstUserKey];
  const stat = stats?.[firstUserKey];
  if (!user || !stat) return null;

  return {
    ok: true,
    username: user.uniqueId || firstUserKey,
    followers: Number(stat.followerCount ?? 0),
    following: Number(stat.followingCount ?? 0),
    likes: Number(stat.heartCount ?? 0),
    source: 'SIGI_STATE',
  };
}

function extractByVisibleHtml(
  $: cheerio.CheerioAPI,
  username: string,
): FollowersResult | null {
  const pageText = $('body').text();

  const followersMatch =
    pageText.match(/([\d.,]+[KMB]?)\s*Followers/i) ||
    pageText.match(/Followers\s*([\d.,]+[KMB]?)/i);

  const followingMatch =
    pageText.match(/([\d.,]+[KMB]?)\s*Following/i) ||
    pageText.match(/Following\s*([\d.,]+[KMB]?)/i);

  const likesMatch =
    pageText.match(/([\d.,]+[KMB]?)\s*Likes/i) ||
    pageText.match(/Likes\s*([\d.,]+[KMB]?)/i);

  const followers = followersMatch ? parseAbbrevNumber(followersMatch[1]) : null;
  const following = followingMatch ? parseAbbrevNumber(followingMatch[1]) : null;
  const likes = likesMatch ? parseAbbrevNumber(likesMatch[1]) : null;

  if (followers !== null) {
    return {
      ok: true,
      username,
      followers,
      following: following ?? undefined,
      likes: likes ?? undefined,
      source: 'visible-html',
    };
  }

  return null;
}

export async function scrapeTikTok(rawHandle: string): Promise<FollowersResult> {
  const clean = normalizeHandle(rawHandle);
  if (!clean) {
    return { ok: false, error: 'Username is required' };
  }

  const url = `https://www.tiktok.com/@${encodeURIComponent(clean)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: BROWSER_HEADERS,
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!res.ok) {
    return { ok: false, error: `TikTok HTTP ${res.status}` };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const universalRaw = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
  if (universalRaw) {
    try {
      const parsed = JSON.parse(universalRaw);
      const result = extractFromUniversalData(parsed);
      if (result) return result;
    } catch {}
  }

  const sigiRaw = $('#SIGI_STATE').html();
  if (sigiRaw) {
    try {
      const parsed = JSON.parse(sigiRaw);
      const result = extractFromSigiState(parsed);
      if (result) return result;
    } catch {}
  }

  const visible = extractByVisibleHtml($, clean);
  if (visible) return visible;

  return {
    ok: false,
    error: 'Could not extract follower count. TikTok markup or anti-bot likely changed.',
  };
}
