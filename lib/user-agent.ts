/**
 * Простой парсер User-Agent без внешних зависимостей.
 * Извлекает device, OS и browser из строки UA.
 */

export interface ParsedUserAgent {
  device: string;
  os: string;
  browser: string;
}

export function parseUserAgent(ua: string | null): ParsedUserAgent {
  if (!ua) return { device: "Unknown", os: "Unknown", browser: "Unknown" };

  return {
    device: detectDevice(ua),
    os: detectOS(ua),
    browser: detectBrowser(ua),
  };
}

function detectDevice(ua: string): string {
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android.*Mobile/i.test(ua)) return "Android Phone";
  if (/Android/i.test(ua)) return "Android Tablet";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function detectOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return "Windows 10+";
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
    return `macOS ${match?.[1]?.replace(/_/g, ".")}`;
  }
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/i);
    return `Android ${match?.[1]}`;
  }
  if (/iPhone OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/iPhone OS (\d+[._]\d+)/i);
    return `iOS ${match?.[1]?.replace(/_/g, ".")}`;
  }
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function detectBrowser(ua: string): string {
  // Order matters — check more specific ones first
  if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/(\d+)/i);
    return `Edge ${match?.[1] ?? ""}`.trim();
  }
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    const match = ua.match(/OPR\/(\d+)/i);
    return `Opera ${match?.[1] ?? ""}`.trim();
  }
  if (/YaBrowser/i.test(ua)) {
    const match = ua.match(/YaBrowser\/(\d+)/i);
    return `Yandex ${match?.[1] ?? ""}`.trim();
  }
  if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/(\d+)/i);
    return `Chrome ${match?.[1] ?? ""}`.trim();
  }
  if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const match = ua.match(/Version\/(\d+(\.\d+)?)/i);
    return `Safari ${match?.[1] ?? ""}`.trim();
  }
  if (/Firefox\/(\d+)/i.test(ua)) {
    const match = ua.match(/Firefox\/(\d+)/i);
    return `Firefox ${match?.[1] ?? ""}`.trim();
  }
  return "Unknown";
}
