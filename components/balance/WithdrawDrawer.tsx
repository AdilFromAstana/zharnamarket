"use client";

import { useEffect, useState } from "react";
import { Drawer, Modal, Input, Button } from "antd";
import { WalletOutlined, CreditCardOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { useInvalidateBalance } from "@/hooks/useBalance";
import {
  MIN_WITHDRAWAL_AMOUNT,
  PLATFORM_COMMISSION_RATE,
} from "@/lib/constants";

type WithdrawMethod = "kaspi" | "halyk" | "card";

const METHODS: { key: WithdrawMethod; label: string }[] = [
  { key: "kaspi", label: "Kaspi Pay" },
  { key: "halyk", label: "Halyk Bank" },
  { key: "card", label: "Visa / MC" },
];

interface WithdrawDrawerProps {
  open: boolean;
  onClose: () => void;
  maxBalance?: number;
}

function WithdrawForm({
  onSuccess,
  maxBalance,
}: {
  onSuccess: () => void;
  maxBalance?: number;
}) {
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<WithdrawMethod>("kaspi");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const invalidateBalance = useInvalidateBalance();

  const commission = amount ? Math.round(amount * PLATFORM_COMMISSION_RATE) : 0;
  const payout = amount ? amount - commission : 0;

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s/g, "").replace(/[^\d]/g, "");
    if (raw === "") {
      setAmount(null);
      return;
    }
    setAmount(Number(raw));
  };

  const displayAmount = amount !== null ? amount.toLocaleString("ru") : "";

  const handleWithdraw = async () => {
    if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) {
      return toast.error(`Минимальная сумма: ${MIN_WITHDRAWAL_AMOUNT} ₸`);
    }
    if (!details.trim()) return toast.error("Укажите реквизиты");

    setLoading(true);
    try {
      await api.post("/api/balance/withdraw", {
        amount,
        method,
        details: details.trim(),
      });
      toast.success("Заявка на вывод отправлена!", {
        description: `${payout.toLocaleString("ru")} ₸ поступят на ваш счёт`,
      });
      invalidateBalance();
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка вывода");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Amount — large centered */}
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
        {maxBalance !== undefined && (
          <p className="text-xs text-gray-400 mt-1">
            Доступно: {maxBalance.toLocaleString("ru")} ₸
          </p>
        )}
      </div>

      {/* Commission calculator */}
      {amount !== null && amount >= MIN_WITHDRAWAL_AMOUNT && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Сумма вывода</span>
            <span>{amount.toLocaleString("ru")} ₸</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Комиссия ({PLATFORM_COMMISSION_RATE * 100}%)</span>
            <span>-{commission.toLocaleString("ru")} ₸</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-200">
            <span>Получите</span>
            <span className="text-emerald-600">
              {payout.toLocaleString("ru")} ₸
            </span>
          </div>
        </div>
      )}

      {/* Payment method */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Куда вывести
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

      {/* Details */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Реквизиты</h3>
        <Input
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={
            method === "kaspi" ? "+7 (777) 123-45-67" : "4400 0000 0000 0000"
          }
          size="large"
          className="rounded-xl"
        />
        <p className="text-xs text-gray-400 mt-1">
          {method === "kaspi"
            ? "Номер телефона Kaspi"
            : "Номер карты для перевода"}
        </p>
      </div>

      {/* CTA */}
      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        onClick={handleWithdraw}
        disabled={!amount || amount < MIN_WITHDRAWAL_AMOUNT || !details.trim()}
        className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 h-14 text-base font-semibold rounded-2xl"
      >
        {amount && amount >= MIN_WITHDRAWAL_AMOUNT
          ? `Вывести ${payout.toLocaleString("ru")} ₸`
          : "Вывести"}
      </Button>
    </div>
  );
}

export default function WithdrawDrawer({
  open,
  onClose,
  maxBalance,
}: WithdrawDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const title = (
    <div className="flex items-center gap-2">
      <WalletOutlined style={{ color: "#10b981" }} />
      <span className="font-semibold">Вывод средств</span>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        styles={{ wrapper: { height: "85vh", borderRadius: "16px 16px 0 0" } }}
        title={title}
        destroyOnHidden
      >
        <WithdrawForm onSuccess={onClose} maxBalance={maxBalance} />
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      title={title}
      destroyOnHidden
    >
      <WithdrawForm onSuccess={onClose} maxBalance={maxBalance} />
    </Modal>
  );
}
