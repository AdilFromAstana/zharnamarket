import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies";

// JWT_SECRET ОБЯЗАТЕЛЕН во всех окружениях
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    "JWT_SECRET environment variable is required. " +
    "Add it to your .env file. Minimum 32 characters. " +
    "Generate with: openssl rand -base64 48",
  );
}

const SECRET = new TextEncoder().encode(jwtSecret);

export interface JWTPayload {
  sub: string; // userId
  email: string | null;
  role: string; // "user" | "admin"
  iat?: number;
  exp?: number;
}

// ─── Создать access-токен (короткоживущий: 15m) ────────────────────────────
export async function signAccessToken(payload: {
  sub: string;
  email: string | null;
  role: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES_IN ?? "15m")
    .sign(SECRET);
}

// ─── Создать refresh-токен (долгоживущий: 30d) ────────────────────────────
export async function signRefreshToken(payload: {
  sub: string;
  email: string | null;
  role: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN ?? "30d")
    .sign(SECRET);
}

// ─── Верифицировать токен ─────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      sub: payload.sub as string,
      email: (payload["email"] as string | null | undefined) ?? null,
      role: (payload["role"] as string) ?? "user",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

// ─── Извлечь токен из заголовка Authorization или httpOnly cookie ──────────
export function extractBearerToken(req: NextRequest): string | null {
  // 1. Приоритет: Authorization header (для тестов и внешних API клиентов)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  // 2. Fallback: httpOnly cookie (основной способ для браузера)
  return req.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
}

// ─── Middleware: получить текущего пользователя из запроса ─────────────────
// Возвращает userId или null (не выбрасывает ошибку — логика в эндпоинте)
export async function getCurrentUserId(
  req: NextRequest,
): Promise<string | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.sub ?? null;
}

// ─── Хелпер: 401 ответ ────────────────────────────────────────────────────
export function unauthorized(message = "Необходима авторизация") {
  return NextResponse.json({ error: message }, { status: 401 });
}

// ─── Хелпер: 403 ответ ────────────────────────────────────────────────────
export function forbidden(message = "Доступ запрещён") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ─── Хелпер: 400 ответ ────────────────────────────────────────────────────
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// ─── Хелпер: 404 ответ ────────────────────────────────────────────────────
export function notFound(message = "Не найдено") {
  return NextResponse.json({ error: message }, { status: 404 });
}

// ─── Хелпер: 500 ответ ────────────────────────────────────────────────────
export function serverError(message = "Внутренняя ошибка сервера") {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ─── Проверка admin-роли из JWT ──────────────────────────────────────────────
export async function requireAdmin(
  req: NextRequest,
): Promise<{ userId: string } | NextResponse> {
  const token = extractBearerToken(req);
  if (!token) return unauthorized();

  const payload = await verifyToken(token);
  if (!payload?.sub) return unauthorized();

  if (payload.role !== "admin") return forbidden("Требуются права администратора");

  return { userId: payload.sub };
}
