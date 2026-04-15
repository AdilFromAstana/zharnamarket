"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, InputNumber, Button, Radio, Input, Alert } from "antd";
import { BankOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, ApiError } from "@/lib/api-client";
import { MIN_WITHDRAWAL_AMOUNT, PLATFORM_COMMISSION_RATE } from "@/lib/constants";

const METHODS = [
  { id: "kaspi", label: "Kaspi Pay", desc: "На номер телефона Kaspi" },
  { id: "halyk", label: "Halyk Bank", desc: "На карту Halyk" },
  { id: "card", label: "Банковская карта", desc: "Visa / Mastercard" },
];

export default function WithdrawPage() {
  useRequireAuth();
  const router = useRouter();

  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState("kaspi");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) {
      return toast.error(`Минимальная сумма вывода: ${MIN_WITHDRAWAL_AMOUNT} ₸`);
    }
    if (!details.trim()) return toast.error("Укажите реквизиты");

    setLoading(true);
    try {
      await api.post("/api/balance/withdraw", { amount, method, details: details.trim() });
      toast.success("Вывод средств отправлен!", {
        description: "Деньги поступят на ваш счёт в течение нескольких минут.",
      });
      router.push("/cabinet/balance");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка вывода");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Вывод средств</h1>

      <div className="space-y-4">
        <Card size="small">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сумма вывода
          </label>
          <InputNumber
            value={amount}
            onChange={(v) => setAmount(v)}
            min={MIN_WITHDRAWAL_AMOUNT}
            placeholder={`Минимум ${MIN_WITHDRAWAL_AMOUNT}`}
            suffix="₸"
            style={{ width: "100%" }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => (v ? parseFloat(v.replace(/,/g, "")) : 0) as unknown as 0}
          />
        </Card>

        <Card size="small">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Способ вывода
          </label>
          <Radio.Group value={method} onChange={(e) => setMethod(e.target.value)} className="w-full">
            <div className="space-y-2">
              {METHODS.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-300 cursor-pointer transition-colors">
                  <Radio value={m.id} />
                  <div>
                    <div className="font-medium text-gray-900">{m.label}</div>
                    <div className="text-xs text-gray-400">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Radio.Group>
        </Card>

        <Card size="small">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Реквизиты
          </label>
          <Input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={method === "kaspi" ? "+7 (777) 123-45-67" : "4400 0000 0000 0000"}
          />
          <p className="text-xs text-gray-400 mt-1">
            {method === "kaspi" ? "Номер телефона Kaspi" : "Номер карты для перевода"}
          </p>
        </Card>

        <p className="text-xs text-gray-400 text-center -mt-1">
          Комиссия платформы: {PLATFORM_COMMISSION_RATE * 100}% от суммы вывода
        </p>

        <Alert
          type="info"
          showIcon
          icon={<BankOutlined />}
          message="Вывод обрабатывается автоматически. Деньги поступят на ваш счёт в течение нескольких минут."
        />

        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleWithdraw}
          disabled={!amount || !details.trim()}
        >
          Запросить вывод
        </Button>
      </div>
    </div>
  );
}
