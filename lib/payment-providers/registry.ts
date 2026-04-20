/**
 * Реестр платёжных провайдеров.
 *
 * Две карты:
 *   - providerById: providerId → PaymentProvider (для webhooks)
 *   - methodToEntry: PaymentMethodId → { providerId, provider, info }
 *     (для роутов которые принимают платёж по методу)
 */

import type {
  PaymentProvider,
  PaymentMethodId,
  PaymentMethodInfo,
} from "./types";

interface MethodEntry {
  providerId: string;
  provider: PaymentProvider;
  info: PaymentMethodInfo;
}

const providerById = new Map<string, PaymentProvider>();
const methodToEntry = new Map<PaymentMethodId, MethodEntry>();

/**
 * Регистрирует провайдер и все методы которые он обслуживает.
 * Если два провайдера объявляют один и тот же метод — побеждает последний
 * зарегистрированный (удобно для локального override).
 */
export function registerProvider(
  providerId: string,
  provider: PaymentProvider,
  methods: PaymentMethodInfo[],
): void {
  providerById.set(providerId, provider);
  for (const info of methods) {
    if (!provider.supportedMethods.includes(info.id)) {
      throw new Error(
        `Provider "${providerId}" не декларирует метод "${info.id}" в supportedMethods`,
      );
    }
    methodToEntry.set(info.id, { providerId, provider, info });
  }
}

/** Найти провайдер, который обрабатывает указанный метод */
export function getProviderForMethod(
  method: PaymentMethodId,
): { providerId: string; provider: PaymentProvider } | null {
  const entry = methodToEntry.get(method);
  return entry ? { providerId: entry.providerId, provider: entry.provider } : null;
}

/** Найти провайдер по его ID (используется в webhook route) */
export function getProviderById(providerId: string): PaymentProvider | null {
  return providerById.get(providerId) ?? null;
}

/** Список всех доступных методов для UI */
export function listMethods(): PaymentMethodInfo[] {
  return Array.from(methodToEntry.values()).map((e) => e.info);
}

export function hasAnyProvider(): boolean {
  return methodToEntry.size > 0;
}

/** Только для тестов */
export function _clearRegistry(): void {
  providerById.clear();
  methodToEntry.clear();
}
