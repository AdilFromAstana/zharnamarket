/**
 * Reusable in-memory rate limiter.
 *
 * Подходит для single-instance deployment (Docker standalone).
 * Для multiple instances — заменить на Redis.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(maxAttempts: number, windowMs: number) {
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
