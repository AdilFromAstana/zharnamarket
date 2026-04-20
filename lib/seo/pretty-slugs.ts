/**
 * Pretty URL slug maps for SEO landing pages.
 *
 * Single-segment slugs like `/ads/almaty` or `/creators/tiktok` that map
 * to filtered listings. Handled by proxy.ts (rewrites to query-param
 * URLs internally while keeping the pretty path in the browser).
 */

/** URL slug → DB city key */
export const CITY_SLUG_TO_KEY: Record<string, string> = {
  almaty: "Almaty",
  astana: "Astana",
  shymkent: "Shymkent",
  karaganda: "Karaganda",
  aktau: "Aktau",
  pavlodar: "Pavlodar",
};

/** URL slug → Platform enum value */
export const PLATFORM_SLUG_TO_KEY: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

/** DB city key → URL slug */
export const CITY_KEY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_SLUG_TO_KEY).map(([slug, key]) => [key, slug]),
);

/** Platform enum value → URL slug */
export const PLATFORM_KEY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_SLUG_TO_KEY).map(([slug, key]) => [key, slug]),
);

export type SlugDimension = "city" | "platform";

export interface ResolvedSlug {
  dimension: SlugDimension;
  dbKey: string;
  slug: string;
}

/** Resolve a URL slug to a filter dimension + DB key. Returns null for unknown slugs. */
export function resolveSlug(slug: string): ResolvedSlug | null {
  const normalized = slug.toLowerCase();
  if (CITY_SLUG_TO_KEY[normalized]) {
    return {
      dimension: "city",
      dbKey: CITY_SLUG_TO_KEY[normalized],
      slug: normalized,
    };
  }
  if (PLATFORM_SLUG_TO_KEY[normalized]) {
    return {
      dimension: "platform",
      dbKey: PLATFORM_SLUG_TO_KEY[normalized],
      slug: normalized,
    };
  }
  return null;
}

/** All valid slugs (for sitemap enumeration) */
export const ALL_CITY_SLUGS = Object.keys(CITY_SLUG_TO_KEY);
export const ALL_PLATFORM_SLUGS = Object.keys(PLATFORM_SLUG_TO_KEY);

/**
 * Given filter state, return a pretty URL path if it maps to one,
 * otherwise null. Used by canonical-URL logic.
 *
 * Rule: exactly ONE filter dimension with exactly ONE value that maps to a known slug.
 */
export function buildPrettyPath(
  base: "/ads" | "/creators",
  filters: {
    cities?: string[];
    platforms?: string[];
    categories?: string[];
  },
): string | null {
  const cities = filters.cities ?? [];
  const platforms = filters.platforms ?? [];
  const categories = filters.categories ?? [];

  const dimsWithValues = [
    cities.length > 0 ? "city" : null,
    platforms.length > 0 ? "platform" : null,
    categories.length > 0 ? "category" : null,
  ].filter(Boolean);

  if (dimsWithValues.length !== 1) return null;

  if (cities.length === 1) {
    const slug = CITY_KEY_TO_SLUG[cities[0]];
    return slug ? `${base}/${slug}` : null;
  }
  if (platforms.length === 1) {
    const slug = PLATFORM_KEY_TO_SLUG[platforms[0]];
    return slug ? `${base}/${slug}` : null;
  }
  return null;
}
