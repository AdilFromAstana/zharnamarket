import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderById } from "@/lib/payment-providers";
import { applyPaymentWebhook } from "@/lib/payment-webhook-handler";

/**
 * GET /api/payments/mock-sim — симулирует страницу оплаты и редирект-обратно
 *                               от платёжного провайдера.
 *
 * Доступен ТОЛЬКО когда mock-провайдер зарегистрирован (non-production).
 * Сразу обрабатывает платёж как успешный и редиректит пользователя на
 * соответствующую страницу приложения.
 */
export async function GET(req: NextRequest) {
  if (!getProviderById("mock")) {
    return NextResponse.json({ error: "Mock payments disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/ads/manage?payment=failed&reason=no_order`);
  }

  // Определяем куда редиректить по типу сессии
  let redirectBase = "/ads/manage";
  try {
    const session = await prisma.paymentSession.findUnique({
      where: { id: orderId },
      select: { type: true },
    });
    if (session?.type === "creator_publication") {
      redirectBase = "/creators/manage";
    }
  } catch {
    // fallback на ads/manage
  }

  // Применяем платёж напрямую через handler (без HTTP-кругаля)
  try {
    const result = await applyPaymentWebhook({
      orderId,
      externalId: `mock_${Date.now()}`,
      status: "success",
      amount: parseFloat(amount ?? "0"),
      rawData: {},
    });

    if (result.ok) {
      return NextResponse.redirect(`${appUrl}${redirectBase}?payment=success`);
    } else {
      return NextResponse.redirect(`${appUrl}${redirectBase}?payment=failed`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}${redirectBase}?payment=failed&reason=handler_error`);
  }
}
