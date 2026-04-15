import { NextResponse } from "next/server";

// Флаг Secure для cookies. Включаем только если сайт реально обслуживается
// по HTTPS — иначе браузер отвергает Secure-cookies на HTTP-соединении,
// из-за чего клиент не видит auth-cookies и не считает пользователя
// залогиненным. Управлять можно через COOKIE_SECURE или NEXT_PUBLIC_APP_URL.
const IS_PRODUCTION =
  process.env.COOKIE_SECURE === "true" ||
  (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "vw_access",
  REFRESH_TOKEN: "vw_refresh",
  AUTH_FLAG: "vw_auth_flag",
  /** Анонимный visitor ID для per-visitor ротации бустов (устанавливается в middleware.ts) */
  VISITOR_ID: "vw_vid",
} as const;

/**
 * Устанавливает httpOnly cookies с JWT токенами на ответ.
 *
 * - access token: httpOnly, path=/api, 15 минут
 * - refresh token: httpOnly, path=/api/auth, 30 дней
 * - auth flag: НЕ httpOnly (для proxy и клиента), path=/, 30 дней
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): NextResponse {
  // Access token — короткоживущий, доступен для всех API routes
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api",
    maxAge: 15 * 60, // 15 минут
  });

  // Refresh token — долгоживущий, доступен ТОЛЬКО для auth endpoints
  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  });

  // Auth flag — НЕ httpOnly, для proxy/middleware и клиентской проверки
  response.cookies.set(COOKIE_NAMES.AUTH_FLAG, "1", {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  });

  return response;
}

/**
 * Очищает все auth cookies.
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  // Удаляем с указанием того же path, с которым были установлены
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api",
    maxAge: 0,
  });

  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });

  response.cookies.set(COOKIE_NAMES.AUTH_FLAG, "", {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
