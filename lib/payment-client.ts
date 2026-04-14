/**
 * Абстракция платёжного провайдера.
 *
 * Поддерживает подключение любого провайдера (PayBox, Kaspi, Halyk и т.д.)
 * через единый интерфейс. Конкретная реализация определяется env-переменной
 * PAYMENT_PROVIDER.
 *
 * Для запуска без реального провайдера — используется mock-режим,
 * который симулирует мгновенную оплату (для тестирования).
 */

// ─── Интерфейсы ────────────────────────────────────────────────────────────

export interface InitPaymentParams {
  /** Сумма в ₸ (KZT) */
  amount: number;
  /** Описание платежа (напр. "Публикация объявления: Ищу блогера") */
  description: string;
  /** Внутренний ID заказа (paymentSession.id) */
  orderId: string;
  /** Выбранный метод оплаты */
  method: "kaspi" | "halyk" | "card";
  /** Email пользователя */
  userEmail: string;
  /** Телефон пользователя (опционально) */
  userPhone?: string;
}

export interface InitPaymentResult {
  /** URL для редиректа пользователя на страницу оплаты */
  paymentUrl: string;
  /** ID транзакции у провайдера */
  externalId: string;
}

export interface WebhookPayload {
  /** ID заказа (наш paymentSession.id) */
  orderId: string;
  /** ID транзакции у провайдера */
  externalId: string;
  /** Статус платежа */
  status: "success" | "failed";
  /** Сумма */
  amount: number;
  /** Сырые данные от провайдера */
  rawData: Record<string, unknown>;
}

// ─── Абстрактный провайдер ─────────────────────────────────────────────────

export interface PaymentProvider {
  /** Инициализировать платёж (создать ссылку на оплату) */
  initPayment(params: InitPaymentParams): Promise<InitPaymentResult>;
  /** Проверить подпись webhook */
  verifyWebhook(body: Record<string, string>, signature: string): boolean;
  /** Распарсить webhook payload */
  parseWebhook(body: Record<string, string>): WebhookPayload;
}

// ─── Mock-провайдер (для разработки и тестирования) ─────────────────────────

class MockPaymentProvider implements PaymentProvider {
  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    console.log(
      `[MockPayment] Инициирован платёж: ${params.amount} ₸ (${params.method}), ` +
      `заказ ${params.orderId}, ${params.description}`,
    );

    // В mock-режиме сразу редиректим на success webhook,
    // который обработает платёж как успешный
    return {
      paymentUrl: `${appUrl}/api/payments/webhook/mock?orderId=${params.orderId}&amount=${params.amount}`,
      externalId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  verifyWebhook(): boolean {
    // В mock-режиме всегда валидно
    return true;
  }

  parseWebhook(body: Record<string, string>): WebhookPayload {
    return {
      orderId: body.orderId ?? "",
      externalId: body.externalId ?? `mock_${Date.now()}`,
      status: (body.status as "success" | "failed") ?? "success",
      amount: parseFloat(body.amount ?? "0"),
      rawData: body,
    };
  }
}

// ─── Фабрика провайдеров ───────────────────────────────────────────────────

function createProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";

  switch (provider) {
    case "mock":
      return new MockPaymentProvider();

    // Когда выберете провайдера — добавьте реализацию:
    //
    // case "paybox":
    //   return new PayBoxProvider();
    //
    // case "kaspi":
    //   return new KaspiProvider();
    //
    // case "halyk":
    //   return new HalykProvider();

    default:
      console.warn(`[Payment] Unknown provider "${provider}", falling back to mock`);
      return new MockPaymentProvider();
  }
}

// Singleton — один экземпляр на весь lifetime сервера
let _provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!_provider) {
    _provider = createProvider();
  }
  return _provider;
}

/**
 * Проверяет, работает ли платёжная система в mock-режиме.
 */
export function isPaymentMock(): boolean {
  return (process.env.PAYMENT_PROVIDER ?? "mock") === "mock";
}
