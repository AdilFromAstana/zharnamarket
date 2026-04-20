import { useState } from "react";
import {
  CheckCircleOutlined,
  CreditCardOutlined,
  TagOutlined,
  WalletOutlined,
  SafetyOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { PaymentMethod } from "@/lib/types/payment";
import { PUBLICATION_PRICE, PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { PromoResult } from "../_types";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import Link from "next/link";

type Step4PaymentProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormInstance<any>;
  isEscrowMode: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  walletBalance: number | null;
  promoCodeInput: string;
  setPromoCodeInput: (v: string) => void;
  promoResult: PromoResult | null;
  setPromoResult: (v: PromoResult | null) => void;
  promoLoading: boolean;
  handleApplyPromo: () => void;
  finalPayPrice: number;
};

export default function Step4Payment({
  form,
  isEscrowMode,
  paymentMethod,
  setPaymentMethod,
  walletBalance,
  promoCodeInput,
  setPromoCodeInput,
  promoResult,
  setPromoResult,
  promoLoading,
  handleApplyPromo,
  finalPayPrice,
}: Step4PaymentProps) {
  const [promoExpanded, setPromoExpanded] = useState(false);
  const { methods: providerMethods, isEmpty: providersEmpty } =
    usePaymentMethods();
  const requiredAmount = isEscrowMode
    ? (form.getFieldValue("totalBudget") ?? 0)
    : finalPayPrice;
  const balance = walletBalance ?? 0;
  const walletSufficient = balance >= requiredAmount;

  const totalPrice = isEscrowMode
    ? (form.getFieldValue("totalBudget") ?? 0)
    : finalPayPrice;

  return (
    <div className="space-y-6">
      {/* ── Сводка (summary) ── */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Сводка</h3>

        <div className="divide-y divide-gray-100">
          {isEscrowMode ? (
            <>
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-gray-600">Бюджет задания</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(form.getFieldValue("totalBudget") ?? 0)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-gray-400">
                  Комиссия платформы ({PLATFORM_COMMISSION_RATE * 100}% с
                  выплат)
                </span>
                <span className="text-sm text-gray-400">
                  ~
                  {formatPrice(
                    Math.round(
                      (form.getFieldValue("totalBudget") ?? 0) *
                        PLATFORM_COMMISSION_RATE,
                    ),
                  )}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-2.5">
                <div>
                  <span className="text-sm text-gray-900">
                    Базовая публикация
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Видно всем креаторам · 7 дней
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(PUBLICATION_PRICE)}
                </span>
              </div>

              {/* Промокод */}
              {promoResult?.valid ? (
                <div className="flex justify-between items-center py-2.5">
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircleOutlined style={{ color: "#16a34a" }} />
                    <span>Промокод {promoCodeInput}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-700">
                      −{formatPrice(promoResult.discountAmount ?? 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoResult(null);
                        setPromoCodeInput("");
                        setPromoExpanded(false);
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              ) : promoExpanded ? (
                <div className="py-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        setPromoResult(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                      placeholder="PROMO2024"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCodeInput.trim()}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {promoLoading ? "..." : "Применить"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setPromoExpanded(true)}
                    className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <TagOutlined style={{ fontSize: 12 }} />
                    Есть промокод?
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Способ оплаты ── */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Как вы хотите оплатить?
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Кошелёк */}
          <button
            type="button"
            onClick={() => walletSufficient && setPaymentMethod("wallet")}
            className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-colors ${
              paymentMethod === "wallet"
                ? "border-blue-500 bg-blue-50/50"
                : walletSufficient
                  ? "border-gray-200 hover:border-gray-300 bg-white"
                  : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
            }`}
          >
            <WalletOutlined
              style={{
                fontSize: 24,
                color: paymentMethod === "wallet" ? "#3b82f6" : "#9ca3af",
              }}
            />
            <span className="text-sm font-medium text-gray-900 mt-2">
              Кошелёк
            </span>
            {walletBalance !== null && (
              <span
                className={`text-xs mt-0.5 ${walletSufficient ? "text-gray-400" : "text-red-500"}`}
              >
                {walletSufficient
                  ? `Доступно ${balance.toLocaleString("ru")} ₸`
                  : `${balance.toLocaleString("ru")} ₸ — мало`}
              </span>
            )}
            {!walletSufficient && walletBalance !== null && (
              <Link
                href={`/cabinet/balance/topup?amount=${Math.max(requiredAmount - balance, 100)}`}
                className="text-xs text-blue-500 hover:text-blue-700 underline mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                Пополнить
              </Link>
            )}
          </button>

          {/* Другие способы */}
          {providerMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id)}
              className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-colors ${
                paymentMethod === method.id
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <CreditCardOutlined
                style={{
                  fontSize: 24,
                  color: paymentMethod === method.id ? "#3b82f6" : "#9ca3af",
                }}
              />
              <span className="text-sm font-medium text-gray-900 mt-2">
                {method.label}
              </span>
              {method.description && (
                <span className="text-xs text-gray-400 mt-0.5">
                  {method.description}
                </span>
              )}
            </button>
          ))}
        </div>

        {providersEmpty && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <InfoCircleOutlined style={{ color: "#d97706", marginTop: 2 }} />
            <div className="text-xs text-amber-900">
              <div className="font-medium">
                Онлайн-оплата временно недоступна
              </div>
              <div className="mt-0.5 text-amber-800/80">
                Сервис работает в бета-режиме. Оплата через карту/Kaspi/Halyk
                откроется после запуска платёжной системы.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Итого ── */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between items-baseline">
          <span className="text-lg font-semibold text-gray-900">
            Всего к оплате:
          </span>
          <div className="text-right">
            {!isEscrowMode && promoResult?.valid && (
              <span className="text-sm text-gray-400 line-through mr-2">
                {formatPrice(PUBLICATION_PRICE)}
              </span>
            )}
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
        {isEscrowMode && (
          <p className="text-xs text-gray-400 text-right mt-1">
            +~
            {formatPrice(
              Math.round(totalPrice * PLATFORM_COMMISSION_RATE),
            )}{" "}
            комиссия с выплат
          </p>
        )}
      </div>

      {/* ── Мини trust-сигнал ── */}
      <p className="text-xs text-gray-400 flex items-center gap-1.5 justify-center">
        <SafetyOutlined style={{ fontSize: 11, color: "#9ca3af" }} />
        {isEscrowMode
          ? "Бюджет на эскроу-счёте. Остаток можно вернуть."
          : "Безопасная оплата · Публикация сразу после подтверждения"}
      </p>
    </div>
  );
}
