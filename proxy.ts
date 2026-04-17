import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy (замена middleware.ts):
 *
 * 1. Защита маршрутов: cookie-флаг "vw_auth_flag" (устанавливается при login).
 * 2. Visitor ID: cookie "vw_vid" для per-visitor ротации бустов.
 * 3. Security headers: HSTS, CSP, XSS-protection и др.
 *
 * Клиентская проверка JWT делается через useRequireAuth() hook.
 */

const SECURITY_HEADERS: Record<string, string> = {
  // Всегда HTTPS, включая поддомены, на 2 года
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Запрет встраивания сайта в iframe (защита от clickjacking)
  "X-Frame-Options": "DENY",
  // Запрет браузеру угадывать MIME-тип (защита от sniffing-атак)
  "X-Content-Type-Options": "nosniff",
  // При переходе на другой сайт — отправлять только origin, без полного URL
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Запрет доступа к камере, микрофону, геолокации и др.
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  // CSP — контроль загрузки ресурсов
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://api.dicebear.com",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com https://oauth.telegram.org",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "),
};

const VISITOR_COOKIE = "vw_vid";
const ONE_YEAR = 365 * 24 * 60 * 60; // секунд

// Статические маршруты, требующие авторизации
const PROTECTED_PATHS = [
  "/cabinet",
  "/ads/new",
  "/ads/manage",
  "/creators/new",
  "/creators/manage",
  "/creators/edit",
  "/onboarding",
  "/admin",
];

// Динамические маршруты, требующие авторизации
const PROTECTED_PATTERNS = [
  /^\/ads\/[^/]+\/edit$/,         // /ads/[id]/edit
  /^\/ads\/[^/]+\/boost$/,        // /ads/[id]/boost
  /^\/creators\/[^/]+\/preview$/, // /creators/[id]/preview
];

// Маршруты для неавторизованных (redirect на / если залогинен)
const AUTH_ONLY_PATHS = ["/auth/login", "/auth/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Проверяем наличие cookie-флага авторизации
  const authFlag = request.cookies.get("vw_auth_flag")?.value;
  const isLoggedIn = authFlag === "1";

  // 1. Защищённые маршруты — редирект неавторизованных
  const isProtected =
    PROTECTED_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    ) || PROTECTED_PATTERNS.some((re) => re.test(pathname));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Страницы auth — редирект авторизованных
  const isAuthPage = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. Security headers
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // 4. Visitor ID для per-visitor ротации бустов
  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return response;
}

export const config = {
  // Не применяем к API маршрутам, статике и системным файлам
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
