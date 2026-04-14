export type PaymentStatus = "pending" | "success" | "failed";

export type PaymentMethod = "kaspi" | "halyk" | "card" | "wallet";

/**
 * Тип буста объявления.
 * Бусты — дополнительные платные услуги, докупаемые из ЛК ПОСЛЕ публикации.
 * Публикация всегда стоит фиксированную сумму (PUBLICATION_PRICE).
 *
 * rise    — поднятие выше в ленте
 * vip     — выделение цветом и бейджем
 * premium — всё вместе (поднятие + выделение + топ)
 */
export type BoostType = "rise" | "vip" | "premium";

export interface BoostOption {
  id: BoostType;
  name: string;
  price: number;
  days: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export interface PaymentSession {
  id: string;
  adId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

/** Сохраняется в localStorage при начале оплаты публикации. */
export interface PendingPaymentState {
  selectedMethod: PaymentMethod;
  savedAt: string; // ISO 8601
}

/** Сохраняется в localStorage при начале оплаты буста из ЛК. */
export interface PendingBoostState {
  adId: string;
  boostType: BoostType;
  selectedMethod: PaymentMethod;
  savedAt: string; // ISO 8601
}
