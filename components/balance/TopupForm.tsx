"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import {
  WalletOutlined,
  CreditCardOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import {
  usePaymentMethods,
  type PaymentMethodId,
} from "@/hooks/usePaymentMethods";

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000];
const MIN_AMOUNT = 100;

interface TopupFormProps {
  initialAmount?: number | null;
  onSuccess?: () => void;
}

export default function TopupForm({
  initialAmount = 5_000,
  onSuccess,
}: TopupFormProps) {
  const [amount, setAmount] = useState<number | null>(initialAmount ?? 5_000);
  const { methods, isEmpty: providersEmpty } = usePaymentMethods("topup");
  const [method, setMethod] = useState<PaymentMethodId | null>(null);
  const [loading, setLoading] = useState(false);

  // Автоматически выбираем первый доступный метод как только он появится
  useEffect(() => {
    if (!method && methods.length > 0) {
      setMethod(methods[0].id);
    }
    if (method && !methods.find((m) => m.id === method)) {
      setMethod(methods[0]?.id ?? null);
    }
  }, [methods, method]);

  const handleTopup = async () => {
    if (!amount || amount < MIN_AMOUNT) {
      toast.error(`Минимальная сумма: ${MIN_AMOUNT} ₸`);
      return;
    }
    if (!method) {
      toast.error("Пополнение временно недоступно");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ paymentUrl: string; sessionId: string }>(
        "/api/payments/wallet/topup",
        { amount, method },
      );
      onSuccess?.();
      window.location.href = res.paymentUrl;
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка при создании платежа");
      setLoading(false);
    }
  };

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s/g, "").replace(/[^\d]/g, "");
    if (raw === "") {
      setAmount(null);
      return;
    }
    setAmount(Number(raw));
  };

  const displayAmount = amount !== null
    ? amount.toLocaleString("ru")
    : "";

  const isQuickSelected = amount !== null && QUICK_AMOUNTS.includes(amount);

  return (
    <div className="space-y-5">
      {/* ── Amount — large centered input ─────────── */}
      <div className="text-center pt-2">
        <div className="relative inline-flex items-baseline justify-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={displayAmount}
            onChange={handleAmountInput}
            placeholder="0"
            className="text-4xl font-bold text-gray-900 text-center bg-transparent outline-none w-44 placeholder:text-gray-300"
          />
          <span className="text-2xl font-semibold text-gray-400">₸</span>
        </div>

        {amount !== null && amount > 0 && amount < MIN_AMOUNT && (
          <p className="text-xs text-red-500 mt-1">
            Минимум: {MIN_AMOUNT} ₸
          </p>
        )}
      </div>

      {/* ── Quick amount chips ────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmount(q)}
            className={`py-2.5 px-1 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
              amount === q
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            {q.toLocaleString("ru")} ₸
          </button>
        ))}
      </div>

      {/* ── Payment method — compact row ──────────── */}
      {providersEmpty ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <InfoCircleOutlined style={{ color: "#d97706", marginTop: 2 }} />
          <div className="text-xs text-amber-900">
            <div className="font-medium">
              Пополнение временно недоступно
            </div>
            <div className="mt-0.5 text-amber-800/80">
              Сервис работает в бета-режиме. Онлайн-оплата откроется после
              запуска платёжной системы.
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Способ оплаты
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all active:scale-[0.97] ${
                  method === m.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    method === m.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <CreditCardOutlined className="text-base" />
                </div>
                <span
                  className={`text-xs font-medium leading-tight text-center ${
                    method === m.id ? "text-emerald-700" : "text-gray-600"
                  }`}
                >
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ──────────────────────────────────── */}
      <Button
        type="primary"
        size="large"
        block
        icon={<WalletOutlined />}
        onClick={handleTopup}
        loading={loading}
        disabled={!amount || amount < MIN_AMOUNT || providersEmpty}
        className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 h-14 text-base font-semibold rounded-2xl"
      >
        {providersEmpty
          ? "Пополнение скоро"
          : amount && amount >= MIN_AMOUNT
            ? `Пополнить на ${amount.toLocaleString("ru")} ₸`
            : "Пополнить"}
      </Button>
    </div>
  );
}
