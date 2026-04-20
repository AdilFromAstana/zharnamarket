import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { SHOW_EXTERNAL_PAYMENT_METHODS } from "@/lib/constants";

export type PaymentMethodId = "kaspi" | "halyk" | "card";

export interface PaymentMethodInfo {
  id: PaymentMethodId;
  label: string;
  description?: string;
  icon?: string;
}

export type PaymentMethodsContext = "purchase" | "topup";

/**
 * Список доступных способов оплаты.
 *
 * На проде, пока не зарегистрирован ни один провайдер, массив пустой —
 * UI должен показать «Способы оплаты временно недоступны» и disable submit.
 *
 * context="purchase" (по умолчанию) уважает SHOW_EXTERNAL_PAYMENT_METHODS:
 * пока флаг выключен, для покупок (объявление/буст/реактивация) внешние
 * провайдеры скрыты — оплата только с кошелька.
 *
 * context="topup" — для формы пополнения, всегда возвращает реальный список
 * (топап через провайдера это единственный способ ввода реальных денег).
 */
export function usePaymentMethods(
  context: PaymentMethodsContext = "purchase",
) {
  const query = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () =>
      api
        .get<{ methods: PaymentMethodInfo[] }>("/api/payments/methods")
        .then((d) => d.methods),
    // Список меняется только при деплое — долгий cache ок
    staleTime: 10 * 60 * 1000,
  });

  if (context === "purchase" && !SHOW_EXTERNAL_PAYMENT_METHODS) {
    // Возвращаем пустой список + isEmpty=true: компоненты сами покажут «Оплата временно недоступна»
    // и направят пользователя оплачивать с кошелька (топап остаётся доступен через context="topup").
    return {
      methods: [] as PaymentMethodInfo[],
      isLoading: false,
      isEmpty: true,
    };
  }

  return {
    methods: query.data ?? [],
    isLoading: query.isLoading,
    isEmpty: !query.isLoading && (query.data?.length ?? 0) === 0,
  };
}
