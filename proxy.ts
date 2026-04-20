import { NextRequest, NextResponse } from "next/server";
import {
  CITY_SLUG_TO_KEY,
  PLATFORM_SLUG_TO_KEY,
} from "@/lib/seo/pretty-slugs";

/**
 * Next.js 16 Proxy (замена middleware.ts):
 *
 * 1. Защита маршрутов: cookie-флаг "vw_auth_flag" (устанавливается при login).
 * 2. Visitor ID: cookie "vw_vid" для per-visitor ротации бустов.
 * 3. Security headers: HSTS, CSP, XSS-protection и др.
 * 4. Pretty-URL rewrites: /ads/almaty → /ads?city=Almaty (SEO landing pages).
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
  // CSP — контроль загрузки ресурсов.
  // PostHog (eu.i.posthog.com) — analytics: нужен script-src + connect-src.
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://api.dicebear.com https://*.posthog.com https://img.youtube.com https://i.ytimg.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com",
    "font-src 'self'",
    "connect-src 'self' https://*.posthog.com",
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

/**
 * Detect pretty-URL (e.g. /ads/almaty, /creators/tiktok) and return
 * rewrite info, or null if it's not a pretty URL.
 *
 * Only matches exactly `/<base>/<slug>` — sub-paths like /ads/<id>/boost
 * fall through untouched.
 */
function resolvePrettyUrl(
  request: NextRequest,
): { rewriteUrl: URL; prettyPath: string } | null {
  const { pathname, searchParams } = request.nextUrl;
  const match = pathname.match(/^\/(ads|creators)\/([^/]+)\/?$/);
  if (!match) return null;

  const [, base, rawSlug] = match;
  const slug = rawSlug.toLowerCase();

  const cityKey = CITY_SLUG_TO_KEY[slug];
  const platformKey = PLATFORM_SLUG_TO_KEY[slug];
  if (!cityKey && !platformKey) return null;

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${base}`;
  // Preserve existing params first, then apply slug-derived filter
  // (explicit filter in query string wins if user somehow combined them).
  for (const [k, v] of searchParams.entries()) {
    rewriteUrl.searchParams.set(k, v);
  }
  if (cityKey && !rewriteUrl.searchParams.get("city")) {
    rewriteUrl.searchParams.set("city", cityKey);
  }
  if (platformKey && !rewriteUrl.searchParams.get("platform")) {
    rewriteUrl.searchParams.set("platform", platformKey);
  }

  return { rewriteUrl, prettyPath: `/${base}/${slug}` };
}

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

  // 3. Pretty-URL rewrite (SEO landing pages) — строится ДО обычного response,
  //    т.к. rewrite меняет таргет роута; security headers и visitor cookie
  //    применяются к rewrite-response единообразно.
  const pretty = resolvePrettyUrl(request);
  const response = pretty
    ? (() => {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-pretty-path", pretty.prettyPath);
        return NextResponse.rewrite(pretty.rewriteUrl, {
          request: { headers: requestHeaders },
        });
      })()
    : NextResponse.next();

  // 4. Security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // 5. Visitor ID для per-visitor ротации бустов
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
