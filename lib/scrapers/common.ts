export const BROWSER_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
};

export function parseAbbrevNumber(input: string): number | null {
  const raw = input.trim().replace(/\s+/g, '').replace(/,/g, '.');
  const match = raw.match(/^([\d.]+)([KMB])?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;

  const suffix = (match[2] || '').toUpperCase();
  const mult =
    suffix === 'K' ? 1_000 :
    suffix === 'M' ? 1_000_000 :
    suffix === 'B' ? 1_000_000_000 : 1;

  return Math.round(value * mult);
}

// Extract a raw handle from either a bare username, @username, or a full URL.
// Returns an empty string when the input yields nothing usable.
export function normalizeHandle(input: string): string {
  if (!input) return '';
  let s = input.trim();
  // If it looks like a URL, take the last non-empty path segment.
  if (/^https?:\/\//i.test(s) || s.includes('/')) {
    try {
      const url = new URL(s.startsWith('http') ? s : `https://${s}`);
      const parts = url.pathname.split('/').filter(Boolean);
      s = parts[0] ?? '';
    } catch {
      const parts = s.split('/').filter(Boolean);
      s = parts[parts.length - 1] ?? '';
    }
  }
  return s.replace(/^@/, '').trim();
}
