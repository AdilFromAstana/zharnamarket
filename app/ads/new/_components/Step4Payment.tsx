import { useState } from "react";
import Link from "next/link";
import { Radio } from "antd";
import {
  CreditCardOutlined,
  SafetyOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TagOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { PaymentMethod } from "@/lib/types/payment";
import { PUBLICATION_PRICE, PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { PromoResult } from "../_types";
import { PROVIDER_PAYMENT_METHODS } from "../_constants";

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
  const [showOtherMethods, setShowOtherMethods] = useState(false);

  const requiredAmount = isEscrowMode
    ? (form.getFieldValue("totalBudget") ?? 0)
    : finalPayPrice;
  const balance = walletBalance ?? 0;
  const walletSufficient = balance >= requiredAmount;

  // Auto-expand other methods if wallet is insufficient
  const otherMethodsVisible = showOtherMethods || !walletSufficient;

  return (
    <div className="space-y-3">
      {/* ── Что оплачивается + Итого ── */}
      <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">
          {isEscrowMode ? "Заморозка бюджета" : "Публикация объявления"}
        </h3>

        {isEscrowMode ? (
          <div className="mb-3 space-y-2">
            <div className="rounded-lg border border-green-200 overflow-hidden">
              <div className="flex justify-between items-center px-3 py-2.5 bg-white">
                <span className="text-sm text-gray-600">Бюджет задания</span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(form.getFieldValue("totalBudget") ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center px-3 py-2 bg-white border-t border-gray-100">
                <span className="text-xs text-gray-400 italic">
                  Комиссия платформы ({PLATFORM_COMMISSION_RATE * 100}% с
                  выплат)
                </span>
                <span className="text-xs text-gray-400 italic">
                  ~
                  {formatPrice(
                    Math.round(
                      (form.getFieldValue("totalBudget") ?? 0) *
                        PLATFORM_COMMISSION_RATE,
                    ),
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 bg-green-50 border-t border-green-200">
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <SafetyOutlined style={{ color: "#16a34a" }} /> Замораживается
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(form.getFieldValue("totalBudget") ?? 0)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 px-0.5">
              Комиссия вычитается из выплат креаторам. RPM:{" "}
              {form.getFieldValue("rpm")} ₸ / 1 000 просм. · Остаток можно
              вернуть.
            </p>
          </div>
        ) : (
          /* ── Regular publication ── */
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <CreditCardOutlined style={{ color: "#fff", fontSize: 14 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">
                Базовая публикация
              </p>
              <p className="text-xs text-gray-500">
                Видно всем креаторам · 7 дней
              </p>
            </div>
            <div className="text-xl font-bold text-gray-900 shrink-0">
              {formatPrice(PUBLICATION_PRICE)}
            </div>
          </div>
        )}

        {/* ── Промокод (collapsible) — только для обычной публикации ── */}
        {!isEscrowMode && (
          <div className="mb-3">
            {promoResult?.valid ? (
              /* Промокод применён — показать результат */
              <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700">
                <CheckCircleOutlined
                  style={{ color: "#16a34a" }}
                  className="shrink-0"
                />
                <span className="font-medium">{promoCodeInput}</span>
                <span>−{formatPrice(promoResult.discountAmount ?? 0)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPromoResult(null);
                    setPromoCodeInput("");
                    setPromoExpanded(false);
                  }}
                  className="ml-auto text-xs text-green-600 hover:text-green-800 underline"
                >
                  Убрать
                </button>
              </div>
            ) : promoExpanded ? (
              /* Промокод раскрыт — input + кнопка */
              <div>
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
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoCodeInput.trim()}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {promoLoading ? "..." : "OK"}
                  </button>
                </div>
                {promoResult !== null && !promoResult.valid && (
                  <div className="mt-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                    <CloseCircleOutlined
                      style={{ color: "#ef4444" }}
                      className="shrink-0"
                    />
                    {promoResult.message}
                  </div>
                )}
              </div>
            ) : (
              /* Промокод свёрнут — ссылка */
              <button
                type="button"
                onClick={() => setPromoExpanded(true)}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <TagOutlined style={{ color: "#3b82f6", fontSize: 12 }} />
                Есть промокод?
              </button>
            )}
          </div>
        )}

        {/* ── Итого ── */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900 text-sm">
              {isEscrowMode ? "Замораживается" : "К оплате"}
            </span>
            <div className="text-right">
              {!isEscrowMode && promoResult?.valid && (
                <span className="text-xs text-gray-400 line-through mr-2">
                  {formatPrice(PUBLICATION_PRICE)}
                </span>
              )}
              {isEscrowMode ? (
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(form.getFieldValue("totalBudget") ?? 0)}
                </span>
              ) : (
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(finalPayPrice)}
                </span>
              )}
            </div>
          </div>
          {isEscrowMode && (
            <div className="text-xs text-gray-400 text-right mt-0.5">
              +~
              {formatPrice(
                Math.round(
                  (form.getFieldValue("totalBudget") ?? 0) *
                    PLATFORM_COMMISSION_RATE,
                ),
              )}{" "}
              комиссия с выплат
            </div>
          )}
        </div>
      </div>

      {/* ── Способ оплаты (smart default + progressive disclosure) ── */}
      <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-5">
        <Radio.Group
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="w-full"
        >
          <div className="space-y-1.5">
            {/* Кошелёк — всегда видим */}
            <label
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                paymentMethod === "wallet"
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-gray-100 hover:border-gray-300"
              }`}
            >
              <Radio value="wallet" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                  <WalletOutlined style={{ color: "#059669" }} />
                  Из кошелька
                </div>
                {walletBalance === null ? (
                  <div className="text-xs text-gray-400">Загрузка...</div>
                ) : walletSufficient ? (
                  <div className="text-xs text-emerald-600 font-medium">
                    Доступно: {balance.toLocaleString("ru")} ₸
                  </div>
                ) : (
                  <div className="text-xs text-red-500">
                    Недостаточно: {balance.toLocaleString("ru")} ₸ из{" "}
                    {requiredAmount.toLocaleString("ru")} ₸{" · "}
                    <Link
                      href={`/balance/topup?amount=${requiredAmount - balance}`}
                      className="underline text-red-500 hover:text-red-700"
                      target="_blank"
                    >
                      Пополнить
                    </Link>
                  </div>
                )}
              </div>
            </label>

            {/* Другие способы — progressive disclosure */}
            {!otherMethodsVisible ? (
              <button
                type="button"
                onClick={() => setShowOtherMethods(true)}
                className="w-full text-left text-sm text-gray-500 hover:text-gray-700 py-1.5 px-1 flex items-center gap-1 transition-colors"
              >
                Другой способ оплаты
                <DownOutlined style={{ color: "#9ca3af", fontSize: 10 }} />
              </button>
            ) : (
              PROVIDER_PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === method.id
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <Radio value={method.id} />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {method.label}
                    </div>
                    <div className="text-xs text-gray-400">{method.desc}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </Radio.Group>
      </div>

      {/* ── Подсказка (вместо тяжёлого Alert) ── */}
      <p className="text-xs text-gray-400 flex items-start gap-1.5 px-1">
        <SafetyOutlined
          style={{ color: "#9ca3af", fontSize: 12 }}
          className="mt-0.5 shrink-0"
        />
        <span>
          {isEscrowMode
            ? "Бюджет замораживается на эскроу-счёте. Выплаты креаторам — после проверки просмотров. Остаток можно вернуть."
            : "После оплаты объявление сразу появится в ленте на 7 дней."}
        </span>
      </p>
    </div>
  );
}
