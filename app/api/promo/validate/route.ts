import { NextRequest, NextResponse } from "next/server";
import { validatePromoCode } from "@/lib/promo";
import { badRequest, serverError } from "@/lib/auth";
import { createRateLimiter, getRequestIP } from "@/lib/rate-limit";

// Rate limit: 10 запросов с IP за 5 минут
const limiter = createRateLimiter(10, 5 * 60 * 1000);

// GET /api/promo/validate?code=SUMMER30&type=ad_publication&amount=990
export async function GET(req: NextRequest) {
  try {
    const ip = getRequestIP(req.headers);
    if (!limiter.check(ip)) {
      return NextResponse.json(
        { error: "Слишком много запросов. Подождите несколько минут." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const type = searchParams.get("type");
    const amountStr = searchParams.get("amount");

    if (!code) return badRequest("Промокод обязателен");
    if (!type) return badRequest("Тип оплаты обязателен");
    if (!amountStr || isNaN(Number(amountStr)))
      return badRequest("Сумма обязательна");

    const validTypes = ["ad_publication", "ad_boost", "creator_publication", "creator_boost"];
    if (!validTypes.includes(type)) return badRequest("Неверный тип оплаты");

    const amount = parseFloat(amountStr);
    const result = await validatePromoCode(
      code,
      type as "ad_publication" | "ad_boost" | "creator_publication" | "creator_boost",
      amount,
    );

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/promo/validate]", err);
    return serverError();
  }
}
