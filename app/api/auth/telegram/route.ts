import { NextResponse } from "next/server";

/**
 * Telegram OAuth — инициирующий редирект.
 *
 * Telegram Login (без JS-виджета) работает через oauth.telegram.org:
 *   https://oauth.telegram.org/auth?bot_id=<BOT_ID>&origin=<ORIGIN>&return_to=<CALLBACK>&request_access=write
 *
 * После подтверждения в Telegram пользователь редиректится на `return_to` с
 * query-параметрами: id, first_name, last_name, username, photo_url, auth_date, hash.
 * `hash` верифицируется в callback через HMAC-SHA256 с bot_token.
 *
 * ENV:
 *   TELEGRAM_BOT_TOKEN          — полный токен "<bot_id>:<secret>" от @BotFather
 *   NEXT_PUBLIC_APP_URL         — origin приложения (должен быть зарегистрирован через /setdomain у @BotFather)
 */
export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (!botToken) {
    return NextResponse.json(
      { error: "Telegram OAuth не настроен" },
      { status: 500 },
    );
  }

  // bot_id — число до двоеточия в токене
  const botId = botToken.split(":")[0];
  if (!botId || !/^\d+$/.test(botId)) {
    return NextResponse.json(
      { error: "Некорректный TELEGRAM_BOT_TOKEN" },
      { status: 500 },
    );
  }

  const returnTo = `${appUrl}/api/auth/telegram/callback`;

  const params = new URLSearchParams({
    bot_id: botId,
    origin: appUrl,
    return_to: returnTo,
    request_access: "write",
    embed: "0",
  });

  const telegramAuthUrl = `https://oauth.telegram.org/auth?${params.toString()}`;
  return NextResponse.redirect(telegramAuthUrl);
}
