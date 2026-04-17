"use client";

import { useState } from "react";
import { Button } from "antd";
import { WalletOutlined, CreditCardOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000];
const MIN_AMOUNT = 100;

type PaymentMethod = "kaspi" | "halyk" | "card";

interface MethodOption {
  key: PaymentMethod;
  label: string;
}

const METHODS: MethodOption[] = [
  { key: "kaspi", label: "Kaspi Pay" },
  { key: "halyk", label: "Halyk Bank" },
  { key: "card", label: "Visa / MC" },
];

interface TopupFormProps {
  initialAmount?: number | null;
  onSuccess?: () => void;
}

export default function TopupForm({
  initialAmount = 5_000,
  onSuccess,
}: TopupFormProps) {
  const [amount, setAmount] = useState<number | null>(initialAmount ?? 5_000);
  const [method, setMethod] = useState<PaymentMethod>("kaspi");
  const [loading, setLoading] = useState(false);

  const handleTopup = async () => {
    if (!amount || amount < MIN_AMOUNT) {
      toast.error(`Минимальная сумма: ${MIN_AMOUNT} ₸`);
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
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Способ оплаты
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all active:scale-[0.97] ${
                method === m.key
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-100 bg-gray-50 hover:border-gray-200"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  method === m.key
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                <CreditCardOutlined className="text-base" />
              </div>
              <span
                className={`text-xs font-medium leading-tight text-center ${
                  method === m.key ? "text-emerald-700" : "text-gray-600"
                }`}
              >
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────── */}
      <Button
        type="primary"
        size="large"
        block
        icon={<WalletOutlined />}
        onClick={handleTopup}
        loading={loading}
        disabled={!amount || amount < MIN_AMOUNT}
        className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 h-14 text-base font-semibold rounded-2xl"
      >
        {amount && amount >= MIN_AMOUNT
          ? `Пополнить на ${amount.toLocaleString("ru")} ₸`
          : "Пополнить"}
      </Button>
    </div>
  );
}
