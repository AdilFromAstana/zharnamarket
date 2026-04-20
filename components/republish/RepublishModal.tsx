"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
  TagOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { PUBLICATION_PRICE, PUBLICATION_DAYS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types/payment";
import { api, ApiError } from "@/lib/api-client";
import { useBalance } from "@/hooks/useBalance";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface RepublishModalProps {
  open: boolean;
  onClose: () => void;
  adId: string;
  adTitle: string;
  /** "expired" — реактивация; "active" — продление от текущего конца */
  mode: "expired" | "active";
  currentExpiresAt?: string | null;
  onSuccess?: () => void;
}

export default function RepublishModal({
  open,
  onClose,
  adId,
  adTitle,
  mode,
  currentExpiresAt,
  onSuccess,
}: RepublishModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kaspi");
  const [methodsExpanded, setMethodsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const walletBalance = useBalance();
  const { methods: providerMethods, isEmpty: providersEmpty } =
    usePaymentMethods();

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discountAmount?: number;
    finalAmount?: number;
    discountType?: string;
    discountValue?: number;
    message?: string;
  } | null>(null);

  const finalPrice =
    promoResult?.valid && promoResult.finalAmount !== undefined
      ? promoResult.finalAmount
      : PUBLICATION_PRICE;

  const walletSufficient =
    walletBalance !== null && walletBalance >= finalPrice;

  useEffect(() => {
    if (!open) return;
    track("republish_modal_view", { ad_id: adId, mode });
    // Reset state on each open
    setPromoCodeInput("");
    setPromoResult(null);
    setPromoExpanded(false);
    setMethodsExpanded(false);
  }, [open, adId, mode]);

  useEffect(() => {
    if (walletSufficient && paymentMethod !== "wallet") {
      if (
        paymentMethod === "kaspi" ||
        !providerMethods.find((m) => m.id === paymentMethod)
      ) {
        setPaymentMethod("wallet");
      }
      return;
    }
    if (!walletSufficient && paymentMethod === "wallet") {
      const first = providerMethods[0]?.id;
      if (first) setPaymentMethod(first);
      return;
    }
    if (
      paymentMethod !== "wallet" &&
      providerMethods.length > 0 &&
      !providerMethods.find((m) => m.id === paymentMethod)
    ) {
      setPaymentMethod(providerMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletSufficient, providerMethods]);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await fetch(
        `/api/promo/validate?code=${encodeURIComponent(promoCodeInput.trim())}&type=ad_publication&amount=${PUBLICATION_PRICE}`,
      );
      const data = await res.json();
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, message: "Ошибка проверки промокода" });
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await api.post<{
        paymentId: string;
        paymentUrl?: string;
        status: string;
        isFree?: boolean;
        fromWallet?: boolean;
        extended?: boolean;
      }>(`/api/payments/ads/${adId}/republish`, {
        method: paymentMethod,
        promoCode: promoResult?.valid ? promoCodeInput.trim() : undefined,
      });

      if (result.isFree || result.status === "success" || result.fromWallet) {
        track("republish_success", {
          ad_id: adId,
          mode,
          amount: promoResult?.finalAmount ?? PUBLICATION_PRICE,
          method: paymentMethod,
        });
        toast.success(
          mode === "expired"
            ? "Публикация возобновлена на 7 дней!"
            : "Публикация продлена на 7 дней!",
        );
        onSuccess?.();
        onClose();
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast.success("Заявка на оплату создана");
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Ошибка оплаты");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "expired"
      ? "Возобновить публикацию"
      : "Продлить публикацию";
  const subtitle =
    mode === "expired"
      ? "Объявление снова появится в ленте на 7 дней"
      : currentExpiresAt
        ? `К текущему сроку добавится ещё ${PUBLICATION_DAYS} дней`
        : `Публикация будет продлена на ${PUBLICATION_DAYS} дней`;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      centered
      destroyOnHidden
      width={480}
    >
      <div className="pt-2">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-5">{subtitle}</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <div className="flex justify-between items-start mb-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Объявление
              </div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {adTitle}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-gray-600">Срок</span>
              <span className="text-sm font-medium">
                {PUBLICATION_DAYS} дней
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-gray-600">Стоимость</span>
              <span className="text-sm font-medium">
                {formatPrice(PUBLICATION_PRICE)}
              </span>
            </div>

            {promoResult?.valid ? (
              <div className="flex justify-between items-center py-2.5">
                <div className="flex items-center gap-1.5 text-sm text-green-700 min-w-0">
                  <CheckCircleOutlined
                    style={{ color: "#16a34a" }}
                    className="shrink-0"
                  />
                  <span className="truncate">Промокод {promoCodeInput}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
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
                {promoResult && !promoResult.valid && (
                  <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <CloseCircleOutlined className="shrink-0" />
                    {promoResult.message}
                  </div>
                )}
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
          </div>

          <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-900">
              К оплате
            </span>
            <div className="text-right">
              {promoResult?.valid && (
                <div className="text-xs text-gray-400 line-through">
                  {formatPrice(PUBLICATION_PRICE)}
                </div>
              )}
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(finalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Способ оплаты */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              Способ оплаты
            </h4>
            {!methodsExpanded && (
              <button
                type="button"
                onClick={() => setMethodsExpanded(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Изменить
              </button>
            )}
          </div>

          {methodsExpanded ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (walletSufficient) {
                    setPaymentMethod("wallet");
                    setMethodsExpanded(false);
                  }
                }}
                className={`relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition-colors ${
                  paymentMethod === "wallet"
                    ? "border-blue-500 bg-blue-50/50"
                    : walletSufficient
                      ? "border-gray-200 hover:border-gray-300 bg-white"
                      : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                }`}
              >
                <WalletOutlined
                  style={{
                    fontSize: 22,
                    color: paymentMethod === "wallet" ? "#3b82f6" : "#9ca3af",
                  }}
                />
                <span className="text-xs font-medium text-gray-900 mt-1.5">
                  Кошелёк
                </span>
                {walletBalance !== null && (
                  <span
                    className={`text-[11px] mt-0.5 ${walletSufficient ? "text-gray-400" : "text-red-500"}`}
                  >
                    {walletSufficient
                      ? `${walletBalance.toLocaleString("ru")} ₸`
                      : `мало: ${walletBalance.toLocaleString("ru")} ₸`}
                  </span>
                )}
                {!walletSufficient && walletBalance !== null && (
                  <Link
                    href={`/cabinet/balance/topup?amount=${Math.max(finalPrice - walletBalance, 100)}`}
                    className="text-[11px] text-blue-500 hover:text-blue-700 underline mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Пополнить
                  </Link>
                )}
              </button>

              {providerMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id);
                    setMethodsExpanded(false);
                  }}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-colors ${
                    paymentMethod === method.id
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <CreditCardOutlined
                    style={{
                      fontSize: 22,
                      color:
                        paymentMethod === method.id ? "#3b82f6" : "#9ca3af",
                    }}
                  />
                  <span className="text-xs font-medium text-gray-900 mt-1.5">
                    {method.label}
                  </span>
                  {method.description && (
                    <span className="text-[11px] text-gray-400 mt-0.5">
                      {method.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMethodsExpanded(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-blue-500 bg-blue-50/40 text-left transition-colors hover:bg-blue-50/70"
            >
              {paymentMethod === "wallet" ? (
                <WalletOutlined style={{ fontSize: 22, color: "#3b82f6" }} />
              ) : (
                <CreditCardOutlined
                  style={{ fontSize: 22, color: "#3b82f6" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {paymentMethod === "wallet"
                    ? "Кошелёк"
                    : (providerMethods.find((m) => m.id === paymentMethod)
                        ?.label ?? paymentMethod)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {paymentMethod === "wallet" && walletBalance !== null
                    ? `доступно ${walletBalance.toLocaleString("ru")} ₸`
                    : (providerMethods.find((m) => m.id === paymentMethod)
                        ?.description ?? "")}
                </div>
              </div>
            </button>
          )}
        </div>

        {providersEmpty && paymentMethod !== "wallet" && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 mt-3">
            <InfoCircleOutlined style={{ color: "#d97706", marginTop: 2 }} />
            <div className="text-xs text-amber-900">
              <div className="font-medium">
                Онлайн-оплата временно недоступна
              </div>
              <div className="mt-0.5 text-amber-800/80">
                Продлить можно с баланса кошелька. Либо дождитесь запуска
                платёжной системы.
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handlePay}
          disabled={loading || (providersEmpty && paymentMethod !== "wallet")}
          className="w-full h-[48px] rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CreditCardOutlined />
          {loading
            ? "Обработка..."
            : providersEmpty && paymentMethod !== "wallet"
              ? "Оплата временно недоступна"
              : mode === "expired"
                ? `Возобновить за ${formatPrice(finalPrice)}`
                : `Продлить за ${formatPrice(finalPrice)}`}
        </button>

        <p className="text-[11px] text-gray-400 flex items-center gap-1.5 justify-center mt-3">
          <SafetyOutlined style={{ fontSize: 10, color: "#9ca3af" }} />
          Безопасная оплата
        </p>
      </div>
    </Modal>
  );
}
