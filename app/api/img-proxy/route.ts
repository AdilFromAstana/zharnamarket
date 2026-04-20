import { NextRequest, NextResponse } from "next/server";

/**
 * Прокси для внешних превью с видеоплатформ (VK/TikTok/YouTube/IG/OK и т.д.).
 *
 * Зачем нужен:
 *   - CSP разрешает img-src 'self' — внешние URL блокируются в браузере
 *   - Превью с подписанными ссылками (tkn/sign) нестабильны
 *   - До сохранения формы мы НЕ скачиваем превью на диск (иначе orphan-файлы)
 *
 * Поэтому показываем через этот прокси, а на сохранении создателя бэкенд
 * зеркалит URL в /uploads/portfolio/... (persistThumbnailIfEphemeral).
 *
 * Публичный (без auth): используется на публичных профилях креаторов.
 * Защита: whitelist хостов (anti-SSRF), лимит размера, content-type только image/*.
 */

const ALLOWED_HOST_SUFFIXES = [
  // VK
  "userapi.com",
  "vk-cdn.net",
  "vkuseraudio.net",
  // OK (odnoklassniki)
  "okcdn.ru",
  "ok.ru",
  "mycdn.me",
  // YouTube
  "ytimg.com",
  "youtube.com",
  "googleusercontent.com",
  // TikTok
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  // Instagram / Meta
  "cdninstagram.com",
  "fbcdn.net",
];

const MAX_BYTES = 5 * 1024 * 1024;

function isAllowedHost(host: string): boolean {
  const lower = host.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (s) => lower === s || lower.endsWith("." + s),
  );
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json(
      { error: 'Missing "url" query parameter' },
      { status: 400 },
    );
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json(
      { error: "Unsupported protocol" },
      { status: 400 },
    );
  }

  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json(
      { error: "Host not in allowlist" },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetch(target.toString(), {
      cache: "no-store",
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Upstream is not an image" },
        { status: 415 },
      );
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Invalid size" }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "content-type": contentType,
        // Кешируем агрессивно: превью видео редко меняется, а signed-URL
        // сохраняет консистентность до истечения срока.
        "cache-control": "public, max-age=3600, s-maxage=86400, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Proxy fetch failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
