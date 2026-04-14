"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, InputNumber, Radio, Alert } from "antd";
import {
  ArrowLeftOutlined,
  WalletOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, ApiError } from "@/lib/api-client";

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000];
const MIN_AMOUNT = 100;

type PaymentMethod = "kaspi" | "halyk" | "card";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  kaspi: "Kaspi Pay",
  halyk: "Halyk Bank",
  card: "Банковская карта",
};

export default function TopupPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-8 px-4" />}>
      <TopupContent />
    </Suspense>
  );
}

function TopupContent() {
  useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Предзаполняем сумму если передана через URL (?amount=37500)
  const prefilledAmount = Number(searchParams.get("amount")) || null;

  const [amount, setAmount] = useState<number | null>(prefilledAmount ?? 5_000);
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

      // Редиректируем на страницу оплаты провайдера
      window.location.href = res.paymentUrl;
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка при создании платежа");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/balance">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeftOutlined />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Пополнить кошелёк</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Средства зачислятся сразу после оплаты
          </p>
        </div>
      </div>

      {/* Amount section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Сумма пополнения
        </h2>

        {/* Quick amount buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              className={`py-2 px-1 rounded-xl text-sm font-medium border transition-all ${
                amount === q
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
              }`}
            >
              {q.toLocaleString("ru")} ₸
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <InputNumber
          value={amount}
          onChange={(v) => setAmount(v)}
          min={MIN_AMOUNT}
          max={10_000_000}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
          parser={(v) => Number(v?.replace(/\s/g, "")) as never}
          suffix="₸"
          size="large"
          className="w-full"
          placeholder="Введите сумму"
        />

        {amount && amount < MIN_AMOUNT && (
          <p className="text-xs text-red-500 mt-1">
            Минимальная сумма: {MIN_AMOUNT} ₸
          </p>
        )}
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Способ оплаты
        </h2>
        <Radio.Group
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="flex flex-col gap-2"
        >
          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
            <Radio key={m} value={m} className="font-medium">
              {METHOD_LABELS[m]}
            </Radio>
          ))}
        </Radio.Group>
      </div>

      {/* Info */}
      <Alert
        type="info"
        showIcon
        icon={<WalletOutlined />}
        message="Деньги зачислятся на кошелёк сразу после успешной оплаты. Используйте кошелёк для публикации объявлений, бустов и финансирования заданий."
        className="mb-5 rounded-xl"
      />

      {/* CTA */}
      <Button
        type="primary"
        size="large"
        block
        icon={<ThunderboltOutlined />}
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
