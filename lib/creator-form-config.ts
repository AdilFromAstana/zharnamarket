export const PLATFORM_URL_CONFIG: Record<
  string,
  {
    prefix: string;
    letter: string;
    badgeClass: string;
    placeholder: string;
  }
> = {
  TikTok: {
    prefix: "tiktok.com/@",
    letter: "T",
    badgeClass: "bg-black text-white",
    placeholder: "username",
  },
  Instagram: {
    prefix: "instagram.com/",
    letter: "I",
    badgeClass:
      "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white",
    placeholder: "username",
  },
  YouTube: {
    prefix: "youtube.com/@",
    letter: "Y",
    badgeClass: "bg-red-600 text-white",
    placeholder: "channel",
  },
  Threads: {
    prefix: "threads.net/@",
    letter: "@",
    badgeClass: "bg-neutral-900 text-white",
    placeholder: "username",
  },
  Telegram: {
    prefix: "t.me/",
    letter: "T",
    badgeClass: "bg-sky-500 text-white",
    placeholder: "username или t.me/channel",
  },
  VK: {
    prefix: "vk.com/",
    letter: "V",
    badgeClass: "bg-blue-600 text-white",
    placeholder: "id или short name",
  },
};

export const PRICE_UNIT_LABELS: Record<string, string> = {
  per_integration: "за интеграцию",
  per_video: "за ролик",
  per_1000_views: "за 1000 показов",
};

const PRICE_UNIT_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PRICE_UNIT_LABELS).map(([k, v]) => [v, k]),
);

export function extractHandle(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    try {
      const parts = new URL(v).pathname.split("/").filter(Boolean);
      return (parts[0] ?? "").replace(/^@/, "");
    } catch {
      return v.replace(/^@/, "");
    }
  }
  return v.replace(/^@/, "").replace(/^\//, "");
}

export function buildPlatformUrl(platformKey: string, handle: string): string {
  const cfg = PLATFORM_URL_CONFIG[platformKey];
  const clean = extractHandle(handle);
  if (!clean) return "";
  if (!cfg) return clean;
  return `https://${cfg.prefix}${clean}`;
}

export function buildPriceLabel(
  platform: string | undefined,
  adFormatLabel: string,
  priceUnit: string | undefined,
): string {
  const base = platform ? `${platform} — ${adFormatLabel}` : adFormatLabel;
  const unit = priceUnit ? PRICE_UNIT_LABELS[priceUnit] : undefined;
  return unit ? `${base} (${unit})` : base;
}

export function parsePriceLabelForForm(
  label: string,
  platformKeys: string[],
): {
  platform?: string;
  adFormatLabel: string;
  priceUnit?: string;
} {
  let base = label;
  let priceUnit: string | undefined;

  const unitMatch = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (unitMatch) {
    const mapped = PRICE_UNIT_REVERSE[unitMatch[2].trim()];
    if (mapped) {
      base = unitMatch[1].trim();
      priceUnit = mapped;
    }
  }

  for (const p of platformKeys) {
    if (base.startsWith(`${p} — `)) {
      return {
        platform: p,
        adFormatLabel: base.slice(p.length + 3),
        priceUnit,
      };
    }
  }
  return { adFormatLabel: base, priceUnit };
}

export type PriceRawItem = {
  platform?: string;
  adFormatLabel?: string;
  price?: number;
  priceUnit?: string;
};

export type PlatformPayload = {
  name: string;
  handle: string;
  url: string;
  followers: number | null;
};

export type PortfolioSource = {
  videoUrl: string;
  category?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  views?: number | null;
  likes?: number | null;
  title?: string | null;
};

export type PortfolioPayload = {
  videoUrl: string;
  category: string | null;
  description: string | null;
  thumbnail: string | null;
  views: number | null;
  likes: number | null;
};

export function buildCreatorPricing(raw: PriceRawItem[] | undefined): {
  minimumRate: number;
  items: { label: string; price: number }[];
} {
  const items = (raw ?? [])
    .filter((it) => it?.adFormatLabel && (it?.price ?? 0) > 0)
    .map((it) => ({
      label: buildPriceLabel(it.platform, it.adFormatLabel!, it.priceUnit),
      price: it.price!,
    }));
  const minimumRate = items.length
    ? Math.min(...items.map((i) => i.price))
    : 0;
  return { minimumRate, items };
}

export function buildCreatorPlatforms(
  handles: Record<string, string | undefined> | undefined,
  followers: Record<string, number | null | undefined> | undefined,
): PlatformPayload[] {
  return Object.entries(handles ?? {})
    .map(([name, raw]) => {
      const handle = extractHandle(raw ?? "");
      if (!handle) return null;
      const f = followers?.[name];
      return {
        name,
        handle,
        url: buildPlatformUrl(name, raw ?? ""),
        followers: typeof f === "number" && f >= 0 ? f : null,
      };
    })
    .filter((v): v is PlatformPayload => v !== null);
}

export function buildCreatorPortfolio(
  items: PortfolioSource[] | undefined,
): PortfolioPayload[] {
  return (items ?? [])
    .filter((item) => item.videoUrl?.trim())
    .map((item) => ({
      videoUrl: item.videoUrl.trim(),
      category: item.category?.trim() || null,
      description: item.description?.trim() || item.title?.trim() || null,
      thumbnail: item.thumbnail || null,
      views:
        typeof item.views === "number" && Number.isFinite(item.views)
          ? item.views
          : null,
      likes:
        typeof item.likes === "number" && Number.isFinite(item.likes)
          ? item.likes
          : null,
    }));
}
