import { NextRequest } from "next/server";
import { getProviderById } from "@/lib/payment-providers";
import { applyPaymentWebhook } from "@/lib/payment-webhook-handler";
import { webhookLimiter, rateLimitGuard, getRequestIP } from "@/lib/rate-limit";

/**
 * POST /api/payments/webhook/[provider] — callback от платёжного провайдера.
 *
 * НЕ требует JWT. Каждый провайдер настраивает свой webhook URL в своём кабинете,
 * провайдер определяется из path параметра [provider]:
 *   /api/payments/webhook/freedom   — для Freedom Pay
 *   /api/payments/webhook/kaspi     — когда будет direct-интеграция Kaspi
 *   /api/payments/webhook/mock      — только в non-production
 *
 * Безопасность: подпись проверяется конкретным провайдером
 * (provider.verifyWebhook). Если провайдер не зарегистрирован — 404.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const ip = getRequestIP(req.headers);
    const limited = rateLimitGuard(webhookLimiter, `webhook:${ip}`, 60);
    if (limited) return new Response("Rate limit", { status: 429 });

    const { provider: providerId } = await params;
    const provider = getProviderById(providerId);
    if (!provider) {
      return new Response("Provider not found", { status: 404 });
    }

    // Парсим тело (form-encoded или JSON)
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, string>;
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(
        Array.from(formData.entries()).map(([k, v]) => [k, String(v)]),
      );
    } else {
      body = await req.json();
    }

    // Проверяем подпись силами самого провайдера
    const signature = req.headers.get("x-signature") ?? body.pg_sig ?? "";
    if (!provider.verifyWebhook(body, signature)) {
      console.error("[Webhook] Invalid signature", {
        providerId,
        orderId: body.pg_order_id ?? body.orderId ?? null,
        bodyKeys: Object.keys(body),
        ip,
      });
      return new Response("Invalid signature", { status: 403 });
    }

    const payload = provider.parseWebhook(body);

    if (!payload.orderId) {
      console.error("[Webhook] Missing orderId", {
        providerId,
        externalId: payload.externalId ?? null,
        status: payload.status ?? null,
      });
      return new Response("Missing orderId", { status: 400 });
    }

    const result = await applyPaymentWebhook(payload);
    if (!result.ok && result.reason === "not_found") {
      console.error("[Webhook] PaymentSession not found", {
        providerId,
        orderId: payload.orderId,
      });
      return new Response("Order not found", { status: 404 });
    }

    // Провайдер ожидает 200 OK
    return new Response("OK", { status: 200 });
  } catch (err) {
    const e = err as Error;
    console.error("[POST /api/payments/webhook]", {
      name: e?.name,
      message: e?.message,
    });
    return new Response("Internal error", { status: 500 });
  }
}
