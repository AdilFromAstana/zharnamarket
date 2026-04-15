import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getRequestIP } from "@/lib/rate-limit";

// Окно dedupe: один IP/юзер = один просмотр в течение этого интервала
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

// Жёсткий rate-limit на запись просмотров: 30/мин с IP (защита от DDoS роута)
const viewRateLimit = createRateLimiter(30, 60 * 1000);

// Простые паттерны ботов в User-Agent — от явной накрутки/краулеров.
// Не претендует на полноту: Googlebot/Yandex и т.п. отсекаем чтобы не искажать статистику.
const BOT_UA_RE =
  /bot|crawler|spider|scraper|curl|wget|httpie|python-requests|java\/|okhttp/i;

export function hashIp(ip: string): string {
  const salt = process.env.VIEW_HASH_SALT ?? "";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true; // пустой UA — скорее всего скрипт
  return BOT_UA_RE.test(ua);
}

interface RecordViewInput {
  headers: Headers;
  userId: string | null;
  ownerUserId: string;
}

type ViewTarget =
  | { kind: "profile"; creatorProfileId: string }
  | { kind: "ad"; adId: string };

/**
 * Записать просмотр с dedupe.
 * Возвращает true если запись создана, false если отброшена (дубль/бот/владелец/rate-limit).
 */
export async function recordView(
  target: ViewTarget,
  { headers, userId, ownerUserId }: RecordViewInput,
): Promise<boolean> {
  // Владелец сам себе просмотры не накручивает
  if (userId && userId === ownerUserId) return false;

  const userAgent = headers.get("user-agent");
  if (isBotUserAgent(userAgent)) return false;

  const ip = getRequestIP(headers);
  if (!viewRateLimit.check(ip)) return false;

  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);

  if (target.kind === "profile") {
    const recent = await prisma.profileView.findFirst({
      where: {
        creatorProfileId: target.creatorProfileId,
        ipHash,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (recent) return false;

    await prisma.profileView.create({
      data: {
        creatorProfileId: target.creatorProfileId,
        userId,
        ipHash,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
    });
    return true;
  }

  const recent = await prisma.adView.findFirst({
    where: {
      adId: target.adId,
      ipHash,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (recent) return false;

  await prisma.adView.create({
    data: {
      adId: target.adId,
      userId,
      ipHash,
      userAgent: userAgent?.slice(0, 500) ?? null,
    },
  });
  return true;
}

interface DailyBucket {
  day: string; // YYYY-MM-DD (UTC)
  count: number;
}

interface ViewStats {
  total: number;
  last7Days: number;
  last30Days: number;
  daily: DailyBucket[]; // последние 30 дней, UTC
}

function startOfUtcDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function computeDailyBuckets(
  rows: { createdAt: Date }[],
  daysBack: number,
): Promise<DailyBucket[]> {
  const today = startOfUtcDay(new Date());
  const counts = new Map<string, number>();
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (daysBack - 1 - i));
    counts.set(toDayKey(d), 0);
  }
  for (const row of rows) {
    const key = toDayKey(startOfUtcDay(row.createdAt));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([day, count]) => ({ day, count }));
}

export async function getProfileViewStats(
  creatorProfileId: string,
): Promise<ViewStats> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, rows30] = await Promise.all([
    prisma.profileView.count({ where: { creatorProfileId } }),
    prisma.profileView.findMany({
      where: { creatorProfileId, createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
  ]);

  const last7Days = rows30.filter((r) => r.createdAt >= since7).length;
  const last30Days = rows30.length;
  const daily = await computeDailyBuckets(rows30, 30);

  return { total, last7Days, last30Days, daily };
}

export async function getAdViewStats(adId: string): Promise<ViewStats> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, rows30] = await Promise.all([
    prisma.adView.count({ where: { adId } }),
    prisma.adView.findMany({
      where: { adId, createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
  ]);

  const last7Days = rows30.filter((r) => r.createdAt >= since7).length;
  const last30Days = rows30.length;
  const daily = await computeDailyBuckets(rows30, 30);

  return { total, last7Days, last30Days, daily };
}
