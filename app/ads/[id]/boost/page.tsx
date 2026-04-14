"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Radio, Divider, Alert, Breadcrumb } from "antd";
import {
  CheckOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { BOOST_OPTIONS, STORAGE_KEYS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { BoostType, PaymentMethod } from "@/lib/types/payment";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: "kaspi", label: "Kaspi Pay", desc: "Быстрая оплата через приложение" },
  { id: "halyk", label: "Halyk Bank", desc: "Онлайн-оплата через Halyk" },
  { id: "card", label: "Банковская карта", desc: "Visa / Mastercard / МИР" },
];

export default function BoostPage() {
  // Защита страницы — редирект если не авторизован
  useRequireAuth();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [selectedBoost, setSelectedBoost] = useState<BoostType>("rise");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kaspi");
  const [loading, setLoading] = useState(false);

  // Состояние промокода
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discountAmount?: number;
    finalAmount?: number;
    discountType?: string;
    discountValue?: number;
    message?: string;
  } | null>(null);

  const currentBoost = BOOST_OPTIONS.find((b) => b.id === selectedBoost)!;

  // При смене типа буста сбрасываем промокод
  const handleBoostSelect = (boostId: BoostType) => {
    setSelectedBoost(boostId);
    setPromoCodeInput("");
    setPromoResult(null);
  };

  // Проверка промокода
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await fetch(
        `/api/promo/validate?code=${encodeURIComponent(promoCodeInput.trim())}&type=ad_boost&amount=${currentBoost.price}`,
      );
      const data = await res.json();
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, message: "Ошибка проверки промокода" });
    } finally {
      setPromoLoading(false);
    }
  };

  const finalPrice =
    promoResult?.valid && promoResult.finalAmount !== undefined
      ? promoResult.finalAmount
      : currentBoost.price;

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await api.post<{
        paymentId: string;
        paymentUrl?: string;
        status: string;
        isFree?: boolean;
      }>(`/api/payments/ads/${id}/boost`, {
        boostType: selectedBoost,
        method: paymentMethod,
        promoCode: promoResult?.valid ? promoCodeInput.trim() : undefined,
      });

      // Очищаем состояние
      try {
        localStorage.removeItem(STORAGE_KEYS.BOOST_STATE);
      } catch {
        // ignore
      }

      if (result.isFree || result.status === "success") {
        toast.success(
          `Продвижение «${currentBoost.name}» активировано на ${currentBoost.days} дней!`,
        );
        router.push("/ads/manage");
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast.success("Заявка на оплату создана.");
        router.push("/ads/manage");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка оплаты продвижения");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Breadcrumb
        className="mb-6"
        items={[
          { title: <Link href="/">Главная</Link> },
          { title: <Link href="/ads/manage">Мои объявления</Link> },
          { title: "Продвижение объявления" },
        ]}
      />

      <div className="max-w-2xl pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Продвижение объявления
          </h1>
          <p className="text-gray-500 text-sm">
            Выберите опцию для увеличения видимости. Продвижение начнёт
            действовать сразу после оплаты.
          </p>
        </div>

        {/* Выбор опции буста */}
        <div className="space-y-3 mb-6">
          {BOOST_OPTIONS.map((boost) => (
            <button
              key={boost.id}
              onClick={() => handleBoostSelect(boost.id)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                selectedBoost === boost.id
                  ? boost.highlight
                    ? "border-purple-400 bg-purple-50"
                    : "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 text-lg">
                      {boost.name}
                    </span>
                    {boost.highlight && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                        Популярный
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {boost.description}
                  </p>
                  <ul className="space-y-1">
                    {boost.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <CheckOutlined className="text-green-500 text-xs" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(boost.price)}
                  </div>
                  <div className="text-xs text-gray-400">{boost.days} дней</div>
                  {selectedBoost === boost.id && (
                    <div className="mt-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center ml-auto">
                      <CheckOutlined className="text-white text-xs" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Итого + промокод */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Итого</h3>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Опция продвижения</span>
            <span className="font-medium">{currentBoost.name}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Срок действия</span>
            <span className="font-medium">{currentBoost.days} дней</span>
          </div>

          {/* Промокод */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Есть промокод?
            </p>
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCodeInput.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {promoLoading ? "..." : "Применить"}
              </button>
            </div>
            {promoResult !== null && (
              <div
                className={`mt-2 text-sm px-3 py-2 rounded-lg ${
                  promoResult.valid
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {promoResult.valid ? (
                  <span className="flex items-center gap-1">
                    <CheckCircleOutlined className="text-green-600 shrink-0" />
                    Скидка{" "}
                    {promoResult.discountType === "percent"
                      ? `${promoResult.discountValue}%`
                      : formatPrice(promoResult.discountAmount ?? 0)}
                    : −{formatPrice(promoResult.discountAmount ?? 0)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CloseCircleOutlined className="text-red-500 shrink-0" />
                    {promoResult.message}
                  </span>
                )}
              </div>
            )}
          </div>

          <Divider />
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold">К оплате</span>
            <div className="text-right">
              {promoResult?.valid && (
                <div className="text-sm text-gray-400 line-through">
                  {formatPrice(currentBoost.price)}
                </div>
              )}
              <span className="font-bold text-gray-900">
                {formatPrice(finalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Способы оплаты */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Способ оплаты</h3>
          <Radio.Group
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full"
          >
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-300 cursor-pointer transition-colors"
                >
                  <Radio value={method.id} />
                  <div>
                    <div className="font-medium text-gray-900">
                      {method.label}
                    </div>
                    <div className="text-xs text-gray-400">{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Radio.Group>
        </div>

        <Alert
          type="info"
          showIcon
          icon={<SafetyOutlined />}
          title="Безопасная оплата"
          description="Продвижение начнёт действовать сразу после подтверждения оплаты. Объявление поднимется в ленте в течение нескольких минут."
          className="mb-6"
        />
      </div>

      <StickyBottomBar
        primaryLabel={`Продвинуть за ${formatPrice(finalPrice)}`}
        onPrimary={handlePay}
        primaryIcon={<CreditCardOutlined />}
        primaryLoading={loading}
        onBack={() => router.push("/ads/manage")}
      />
    </PublicLayout>
  );
}
