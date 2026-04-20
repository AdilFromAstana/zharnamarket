import type {
  PaymentProvider,
  PaymentMethodId,
  InitPaymentParams,
  InitPaymentResult,
  WebhookPayload,
} from "./types";

/**
 * Mock-провайдер. Регистрируется ТОЛЬКО в non-production окружении (см. index.ts).
 * Всегда подтверждает webhook — использовать только для dev/e2e.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly supportedMethods: readonly PaymentMethodId[] = ["kaspi", "halyk", "card"];

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    console.log(
      `[MockPayment] Платёж: ${params.amount} ₸ (${params.method}), ` +
        `заказ ${params.orderId}, ${params.description}`,
    );

    return {
      paymentUrl: `${appUrl}/api/payments/mock-sim?orderId=${params.orderId}&amount=${params.amount}`,
      externalId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  verifyWebhook(): boolean {
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
