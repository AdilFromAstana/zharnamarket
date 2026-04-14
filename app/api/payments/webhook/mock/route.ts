import { NextRequest, NextResponse } from "next/server";
import { isPaymentMock } from "@/lib/payment-client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/payments/webhook/mock — эмуляция redirect-back от платёжного провайдера.
 *
 * Доступен ТОЛЬКО в mock-режиме. Симулирует успешную оплату и
 * вызывает основной webhook endpoint.
 */
export async function GET(req: NextRequest) {
  // Защита: только в mock-режиме
  if (!isPaymentMock()) {
    return NextResponse.json({ error: "Mock payments disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/ads/manage?payment=failed&reason=no_order`);
  }

  // Определяем redirect URL по типу платёжной сессии
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
    // Если не удалось определить тип — fallback на ads/manage
  }

  // Вызываем основной webhook как если бы это был callback от провайдера
  try {
    const webhookRes = await fetch(`${appUrl}/api/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        externalId: `mock_${Date.now()}`,
        status: "success",
        amount: amount ?? "0",
      }),
    });

    if (webhookRes.ok) {
      return NextResponse.redirect(`${appUrl}${redirectBase}?payment=success`);
    } else {
      return NextResponse.redirect(`${appUrl}${redirectBase}?payment=failed`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}${redirectBase}?payment=failed&reason=webhook_error`);
  }
}
