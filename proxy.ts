import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy (замена middleware.ts) — защита маршрутов + visitor cookie.
 *
 * 1. Защита маршрутов: cookie-флаг "vw_auth_flag" (устанавливается при login).
 * 2. Visitor ID: cookie "vw_vid" для per-visitor ротации бустов —
 *    разные посетители видят разный порядок бустнутых элементов.
 *
 * Клиентская проверка JWT делается через useRequireAuth() hook.
 */

const VISITOR_COOKIE = "vw_vid";
const ONE_YEAR = 365 * 24 * 60 * 60; // секунд

// Статические маршруты, требующие авторизации
const PROTECTED_PATHS = [
  "/cabinet",
  "/settings",
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

  // 3. Visitor ID для per-visitor ротации бустов
  const response = NextResponse.next();
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
