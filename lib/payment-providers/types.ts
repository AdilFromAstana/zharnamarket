/**
 * Общий интерфейс платёжного провайдера.
 *
 * Модель: провайдер (Freedom Pay, Kaspi Direct, …) поддерживает набор
 * платёжных методов из Prisma enum PaymentMethod (kaspi, halyk, card).
 * В БД храним только method — какой юзер выбрал. Какой провайдер это обработал
 * определяется реестром и URL webhook-а.
 */

/** Методы из Prisma enum PaymentMethod (без wallet — он обрабатывается внутренне) */
export type PaymentMethodId = "kaspi" | "halyk" | "card";

export interface InitPaymentParams {
  /** Сумма в ₸ (KZT) */
  amount: number;
  /** Описание платежа (напр. "Публикация объявления: Ищу блогера") */
  description: string;
  /** Внутренний ID заказа (paymentSession.id) */
  orderId: string;
  /** Какой метод выбрал юзер */
  method: PaymentMethodId;
  /** Email пользователя */
  userEmail: string;
  /** Телефон пользователя (опционально) */
  userPhone?: string;
}

export interface InitPaymentResult {
  /** URL для редиректа пользователя на страницу оплаты провайдера */
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
  /** Сумма в ₸ */
  amount: number;
  /** Сырые данные от провайдера (для логов) */
  rawData: Record<string, unknown>;
}

export interface PaymentProvider {
  /** Какие методы этот провайдер умеет обрабатывать */
  readonly supportedMethods: readonly PaymentMethodId[];
  /** Создать платёжную сессию у провайдера, вернуть URL для редиректа */
  initPayment(params: InitPaymentParams): Promise<InitPaymentResult>;
  /** Проверить HMAC/RSA-подпись webhook-уведомления от провайдера */
  verifyWebhook(body: Record<string, string>, signature: string): boolean;
  /** Распарсить формат webhook-уведомления в унифицированный WebhookPayload */
  parseWebhook(body: Record<string, string>): WebhookPayload;
}

/**
 * Метаданные метода для отображения в UI.
 * Возвращаются из GET /api/payments/methods.
 */
export interface PaymentMethodInfo {
  /** ID метода (совпадает с Prisma enum PaymentMethod) */
  id: PaymentMethodId;
  /** Человекочитаемое имя ("Kaspi Pay", "Halyk") */
  label: string;
  /** Короткое описание под кнопкой (опционально) */
  description?: string;
  /** URL или имя иконки (опционально) */
  icon?: string;
}
