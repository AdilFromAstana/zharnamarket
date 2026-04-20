/**
 * Инициализация реестра платёжных провайдеров.
 *
 * Провайдер регистрируется только если:
 *   - его реализация готова (класс имплементирует PaymentProvider без throw'ов);
 *   - в env установлены необходимые ключи.
 *
 * Если ни один провайдер не зарегистрирован:
 *   - GET /api/payments/methods вернёт []
 *   - UI покажет «Способы оплаты временно недоступны»
 *   - POST на любой payment-endpoint вернёт 400 "Способ оплаты недоступен"
 *   - Webhook на /api/payments/webhook/<unknown> вернёт 404
 *
 * Добавить нового провайдера:
 *   1. Создать файл lib/payment-providers/<name>.ts с классом, реализующим PaymentProvider.
 *      Заявить supportedMethods (из PaymentMethodId).
 *   2. Добавить блок if (process.env.<NAME>_KEY) { registerProvider(...) } ниже.
 *   3. В кабинете провайдера настроить webhook URL:
 *      https://<domain>/api/payments/webhook/<providerId>
 */

import { registerProvider } from "./registry";
import { MockPaymentProvider } from "./mock";
// import { FreedomPayProvider } from "./freedom";

let bootstrapped = false;

export function bootstrapPaymentProviders(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  // ─── Mock: только в non-production ───────────────────────────────────────
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PAYMENT_MOCK !== "false"
  ) {
    registerProvider("mock", new MockPaymentProvider(), [
      {
        id: "kaspi",
        label: "Kaspi (mock)",
        description: "Симуляция оплаты — dev only",
      },
      {
        id: "halyk",
        label: "Halyk (mock)",
        description: "Симуляция оплаты — dev only",
      },
      {
        id: "card",
        label: "Карта (mock)",
        description: "Симуляция оплаты — dev only",
      },
    ]);
  }

  // ─── TODO: Freedom Pay ───────────────────────────────────────────────────
  // Раскомментировать, когда freedom.ts будет реализован и выставлены env-ключи:
  //
  // if (process.env.FREEDOM_MERCHANT_ID && process.env.FREEDOM_SECRET_KEY) {
  //   registerProvider(
  //     "freedom",
  //     new FreedomPayProvider({
  //       merchantId: process.env.FREEDOM_MERCHANT_ID,
  //       secretKey: process.env.FREEDOM_SECRET_KEY,
  //     }),
  //     [
  //       { id: "kaspi", label: "Kaspi Pay", icon: "/icons/kaspi.svg" },
  //       { id: "halyk", label: "Halyk", icon: "/icons/halyk.svg" },
  //       { id: "card", label: "Банковская карта", icon: "/icons/card.svg" },
  //     ],
  //   );
  // }

  // ─── Будущие прямые интеграции (пример) ──────────────────────────────────
  // if (process.env.KASPI_API_KEY) {
  //   registerProvider("kaspi-direct", new KaspiProvider(...), [
  //     { id: "kaspi", label: "Kaspi (напрямую)" },
  //   ]);
  //   // Перезапишет Kaspi-метод Freedom — direct-интеграция в приоритете
  // }
}

// Авто-инициализация при первом импорте модуля
bootstrapPaymentProviders();

// Реэкспорты — роуты импортируют всё отсюда
export {
  getProviderForMethod,
  getProviderById,
  listMethods,
  hasAnyProvider,
} from "./registry";
export type {
  PaymentProvider,
  PaymentMethodId,
  InitPaymentParams,
  InitPaymentResult,
  WebhookPayload,
  PaymentMethodInfo,
} from "./types";
