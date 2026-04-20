import type {
  PaymentProvider,
  PaymentMethodId,
  InitPaymentParams,
  InitPaymentResult,
  WebhookPayload,
} from "./types";

/**
 * Freedom Pay — шлюз, обслуживающий Kaspi / Halyk / карты через один API.
 *
 * СКЕЛЕТ, НЕ РЕАЛИЗОВАН. Чтобы активировать:
 *   1. Реализуйте методы ниже по документации Freedom Pay.
 *   2. Установите в .env: FREEDOM_MERCHANT_ID, FREEDOM_SECRET_KEY.
 *   3. В index.ts раскомментируйте блок регистрации (поиск "TODO: Freedom").
 *   4. В кабинете Freedom Pay настройте webhook URL:
 *      https://<your-domain>/api/payments/webhook/freedom
 *
 * Документация: https://developer.freedompay.kz/
 */
export class FreedomPayProvider implements PaymentProvider {
  readonly supportedMethods: readonly PaymentMethodId[] = ["kaspi", "halyk", "card"];

  constructor(
    private config: {
      merchantId: string;
      secretKey: string;
    },
  ) {}

  async initPayment(_params: InitPaymentParams): Promise<InitPaymentResult> {
    // TODO: запрос к Freedom Pay Init API:
    //   POST https://api.freedompay.kz/init_payment.php
    //   Параметры: pg_merchant_id, pg_order_id, pg_amount, pg_description,
    //              pg_salt, pg_sig (HMAC-MD5)
    //   Ответ содержит pg_redirect_url (→ paymentUrl) и pg_payment_id (→ externalId)
    throw new Error("FreedomPayProvider.initPayment не реализован");
  }

  verifyWebhook(_body: Record<string, string>, _signature: string): boolean {
    // TODO: проверить pg_sig (HMAC-MD5) — алгоритм Freedom Pay:
    //   сортировать поля, merge с secretKey → md5
    throw new Error("FreedomPayProvider.verifyWebhook не реализован");
  }

  parseWebhook(_body: Record<string, string>): WebhookPayload {
    // TODO: распарсить формат Freedom Pay:
    //   pg_order_id → orderId
    //   pg_payment_id → externalId
    //   pg_result (1/0) → status
    //   pg_amount → amount
    throw new Error("FreedomPayProvider.parseWebhook не реализован");
  }
}
