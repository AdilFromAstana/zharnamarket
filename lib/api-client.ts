/**
 * API клиент с httpOnly cookie авторизацией.
 *
 * Токены хранятся в httpOnly cookies (устанавливаются сервером).
 * Клиент НЕ имеет доступа к JWT — безопасно от XSS.
 *
 * - При 401 автоматически пробует refresh (1 раз)
 * - При неудачном refresh — редирект на /auth/login
 * - Очередь запросов при одновременном refresh
 */

const API_BASE = ""; // относительные пути

// ─── Кэш пользователя в localStorage (только данные, не токены) ─────────────

const USER_STORAGE_KEY = "vw_user";

export function saveUser(user: object) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // SSR or localStorage disabled
  }
}

export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearUserCache() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Удаляет vw_auth_flag локально — нужно при протухшей сессии,
// чтобы proxy не зациклил redirect'ы /auth/login → / → /auth/login.
function clearAuthFlag() {
  if (typeof document === "undefined") return;
  document.cookie = "vw_auth_flag=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

/**
 * Проверяет наличие auth-флага (cookie vw_auth_flag).
 * Этот cookie НЕ httpOnly — клиент может его прочитать.
 */
export function isAuthenticated(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("vw_auth_flag=1");
}

// ─── Базовый fetch с авто-refresh ─────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value: void) => void;
  reject: (reason: unknown) => void;
}> = [];

function processRefreshQueue(error: unknown | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  refreshQueue = [];
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include", // Отправляет httpOnly cookies автоматически
  });

  // 401 → пробуем refresh
  if (res.status === 401) {
    if (isRefreshing) {
      // Ждём пока другой запрос завершит refresh
      await new Promise<void>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      });

      // Retry после успешного refresh
      const retryRes = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        credentials: "include",
      });

      if (!retryRes.ok) {
        const errData = await retryRes.json().catch(() => ({}));
        throw new ApiError(retryRes.status, errData.error ?? "Ошибка");
      }

      if (retryRes.status === 204) return undefined as unknown as T;
      return retryRes.json() as Promise<T>;
    }

    isRefreshing = true;
    const refreshOk = await tryRefresh();
    isRefreshing = false;

    if (refreshOk) {
      processRefreshQueue(null);

      // Retry текущий запрос
      const retryRes = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        credentials: "include",
      });

      if (!retryRes.ok) {
        const errData = await retryRes.json().catch(() => ({}));
        throw new ApiError(retryRes.status, errData.error ?? "Ошибка");
      }

      if (retryRes.status === 204) return undefined as unknown as T;
      return retryRes.json() as Promise<T>;
    } else {
      // Refresh не удался — разлогиниваем
      const error = new ApiError(401, "Сессия истекла");
      processRefreshQueue(error);
      clearUserCache();
      clearAuthFlag();
      // Best-effort: попросим сервер почистить httpOnly cookies.
      // Endpoint идемпотентный, не требует валидной сессии.
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      throw error;
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errData.error ?? "Ошибка сервера", errData);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ─── Кастомный класс ошибки ────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly data?: Record<string, any>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Shorthand методы ──────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(url: string, options?: RequestInit) =>
    apiFetch<T>(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(url, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(url, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(url, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: RequestInit) =>
    apiFetch<T>(url, { ...options, method: "DELETE" }),
};
