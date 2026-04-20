/**
 * Reusable in-memory rate limiter.
 *
 * Подходит для single-instance deployment (Docker standalone).
 *
 * Миграция на Redis (когда понадобится multi-instance):
 * 1. `npm i @upstash/ratelimit @upstash/redis` (или `ioredis` для self-hosted)
 * 2. Заменить внутренности `createRateLimiter` на Upstash sliding window,
 *    сохранив сигнатуру `.check(key) -> boolean`.
 * 3. В env добавить UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 * API потребителей при этом не меняется.
 */

import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): boolean;
}

export function createRateLimiter(maxAttempts: number, windowMs: number): RateLimiter {
  const store = new Map<string, RateLimitRecord>();

  // Периодическая очистка старых записей (каждые 5 минут)
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, record] of store) {
      if (now > record.resetAt) store.delete(key);
    }
  }

  return {
    check(key: string): boolean {
      cleanup();
      const now = Date.now();
      const record = store.get(key);

      if (!record || now > record.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (record.count >= maxAttempts) return false;

      record.count++;
      return true;
    },
  };
}

/**
 * Извлекает IP из заголовков запроса.
 */
export function getRequestIP(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Проверяет rate limit и возвращает 429-ответ, если превышен.
 * Возвращает null, если запрос можно продолжать.
 */
export function rateLimitGuard(
  limiter: RateLimiter,
  key: string,
  retryAfterSec = 60,
  message = "Слишком много запросов. Попробуйте позже.",
): NextResponse | null {
  if (limiter.check(key)) return null;
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

// ─── Общие лимитеры для payments/upload/webhook ─────────────────────────────

/**
 * Upload: 20 файлов за час на пользователя.
 * Ключ: `upload:{userId}`
 */
export const uploadLimiter = createRateLimiter(20, 60 * 60 * 1000);

/**
 * Payment mutations (boost/publish/republish/topup/escrow): 10 попыток за 10 минут на пользователя.
 * Защищает от спама создания PaymentSession.
 * Ключ: `payment:{userId}`
 */
export const paymentLimiter = createRateLimiter(10, 10 * 60 * 1000);

/**
 * Webhook: 100 запросов за минуту с одного IP.
 * Экономит CPU от флуда; подпись всё равно отсекает невалидные.
 * Ключ: `webhook:{ip}`
 */
export const webhookLimiter = createRateLimiter(100, 60 * 1000);
