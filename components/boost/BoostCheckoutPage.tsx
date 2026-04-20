"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, Breadcrumb, Button } from "antd";
import {
  CheckOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  TagOutlined,
  WalletOutlined,
  FireOutlined,
} from "@ant-design/icons";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { BOOST_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type {
  BoostType,
  PaymentMethod,
  BoostOption,
} from "@/lib/types/payment";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useBalance } from "@/hooks/useBalance";
import {
  BOOST_PRIORITY,
  getTopBoost,
  formatDaysLeft,
  type ActiveBoostDetail,
} from "@/lib/boost-helpers";
import { computeProRatedDiscount } from "@/lib/boost";
import { track } from "@/lib/analytics";
import { InfoCircleOutlined } from "@ant-design/icons";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

export type BoostEntity = "ad" | "creator";

export interface BoostCheckoutLabels {
  pageTitle: string;
  pageSubtitle: string;
  breadcrumbParent: { label: string; href: string };
  breadcrumbCurrent: string;
  safetyDescription: string;
}

export interface BoostCheckoutConfig {
  entity: BoostEntity;
  boostOptions: BoostOption[];
  fetchEntity: (
    id: string,
  ) => Promise<{ activeBoostDetails?: ActiveBoostDetail[] } | null>;
  paymentEndpoint: (id: string) => string;
  promoType: "ad_boost" | "creator_boost";
  returnUrl: string;
  labels: BoostCheckoutLabels;
}

function perDayPrice(price: number, days: number): string {
  if (days <= 0) return "";
  return `≈ ${formatPrice(Math.round(price / days))}/день`;
}

/**
 * Экономия для тарифа, если его цена ниже суммы всех остальных тарифов ниже.
 * Срабатывает только для "highlight"-тарифа (премиум-бандл).
 */
function computeSavings(opt: BoostOption, all: BoostOption[]): number | null {
  if (!opt.highlight) return null;
  const lowerSum = all
    .filter((o) => o.price < opt.price)
    .reduce((sum, o) => sum + o.price, 0);
  const savings = lowerSum - opt.price;
  return savings > 0 ? savings : null;
}

export default function BoostCheckoutPage({
  config,
}: {
  config: BoostCheckoutConfig;
}) {
  useRequireAuth();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [selectedBoost, setSelectedBoost] = useState<BoostType>("rise");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kaspi");
  const { methods: providerMethods, isEmpty: providersEmpty } =
    usePaymentMethods();
  const [loading, setLoading] = useState(false);
  const [activeBoost, setActiveBoost] = useState<ActiveBoostDetail | null>(
    null,
  );

  const walletBalance = useBalance();

  useEffect(() => {
    if (!id) return;
    track("boost_checkout_view", { entity: config.entity, entity_id: id });
    config
      .fetchEntity(id)
      .then((entity) => {
        const top = getTopBoost(entity?.activeBoostDetails);
        if (top) {
          setActiveBoost(top);
          // По умолчанию предлагаем продлить активный тариф (совпадает с «Продлить буст»).
          // Юзер может сам кликнуть на более высокий тариф для апгрейда.
          setSelectedBoost(top.boostType);
        }
      })
      .catch(() => {});
  }, [id, config]);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [methodsExpanded, setMethodsExpanded] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discountAmount?: number;
    finalAmount?: number;
    discountType?: string;
    discountValue?: number;
    message?: string;
  } | null>(null);

  const currentBoost = config.boostOptions.find((b) => b.id === selectedBoost)!;

  const handleBoostSelect = (boostId: BoostType) => {
    setSelectedBoost(boostId);
    setPromoCodeInput("");
    setPromoResult(null);
    setPromoExpanded(false);
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await fetch(
        `/api/promo/validate?code=${encodeURIComponent(promoCodeInput.trim())}&type=${config.promoType}&amount=${currentBoost.price}`,
      );
      const data = await res.json();
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, message: "Ошибка проверки промокода" });
    } finally {
      setPromoLoading(false);
    }
  };

  // Pro-rated discount: остаток от активного младшего тира при апгрейде
  const proRatedDiscount =
    activeBoost &&
    BOOST_PRIORITY[selectedBoost] > BOOST_PRIORITY[activeBoost.boostType]
      ? computeProRatedDiscount(
          {
            boostType: activeBoost.boostType,
            expiresAt: new Date(activeBoost.expiresAt),
          },
          currentBoost,
          config.boostOptions,
          new Date(),
        )
      : 0;

  const promoDiscount =
    promoResult?.valid && promoResult.discountAmount !== undefined
      ? promoResult.discountAmount
      : 0;

  const finalPrice = Math.max(
    0,
    currentBoost.price - promoDiscount - proRatedDiscount,
  );

  // Blocked только для тарифов НИЖЕ активного. Same-tier = renewal, разрешено.
  // Также блокируем оплату, если нет провайдеров и юзер выбрал не кошелёк.
  const noProviderAvailable = providersEmpty && paymentMethod !== "wallet";
  const isSelectedBlocked =
    noProviderAvailable ||
    (!!activeBoost &&
      BOOST_PRIORITY[selectedBoost] < BOOST_PRIORITY[activeBoost.boostType]);
  const isRenewal = !!activeBoost && selectedBoost === activeBoost.boostType;
  const isUpgrade =
    !!activeBoost &&
    BOOST_PRIORITY[selectedBoost] > BOOST_PRIORITY[activeBoost.boostType];

  const walletSufficient =
    walletBalance !== null && walletBalance >= finalPrice;

  // Auto-select: wallet если хватает, иначе первый доступный провайдер, иначе wallet.
  useEffect(() => {
    if (walletSufficient && paymentMethod !== "wallet") {
      // Переключаемся на wallet только если текущий метод — захардкоженный дефолт
      // или метод, который больше не доступен среди провайдеров.
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
    // Если текущий провайдер не в списке — переключаемся на первый доступный
    if (
      paymentMethod !== "wallet" &&
      providerMethods.length > 0 &&
      !providerMethods.find((m) => m.id === paymentMethod)
    ) {
      setPaymentMethod(providerMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletSufficient, providerMethods]);

  const savingsByTier = useMemo(() => {
    const map: Partial<Record<BoostType, number>> = {};
    for (const opt of config.boostOptions) {
      const s = computeSavings(opt, config.boostOptions);
      if (s !== null) map[opt.id] = s;
    }
    return map;
  }, [config.boostOptions]);

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await api.post<{
        paymentId: string;
        paymentUrl?: string;
        status: string;
        isFree?: boolean;
        fromWallet?: boolean;
      }>(config.paymentEndpoint(id), {
        boostType: selectedBoost,
        method: paymentMethod,
        promoCode: promoResult?.valid ? promoCodeInput.trim() : undefined,
      });

      if (result.isFree || result.status === "success" || result.fromWallet) {
        track("boost_purchase_success", {
          entity: config.entity,
          entity_id: id,
          boost_type: selectedBoost,
          amount: promoResult?.finalAmount ?? currentBoost.price,
          method: paymentMethod,
          is_free: !!result.isFree,
        });
        toast.success(
          `Продвижение «${currentBoost.name}» активировано на ${currentBoost.days} дней!`,
        );
        router.push(config.returnUrl);
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast.success("Заявка на оплату создана.");
        router.push(config.returnUrl);
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

  const { labels } = config;
  const primaryVerb = isRenewal
    ? "Продлить"
    : isUpgrade
      ? "Апгрейд"
      : "Продвинуть";
  const primaryLabel = noProviderAvailable
    ? "Оплата временно недоступна"
    : isSelectedBlocked
      ? "Тариф недоступен"
      : `${primaryVerb} за ${formatPrice(finalPrice)}`;

  return (
    <PublicLayout>
      <Breadcrumb
        className="mb-6"
        items={[
          { title: <Link href="/">Главная</Link> },
          {
            title: (
              <Link href={labels.breadcrumbParent.href}>
                {labels.breadcrumbParent.label}
              </Link>
            ),
          },
          { title: labels.breadcrumbCurrent },
        ]}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:items-start">
        {/* ── Left column: header + cards ── */}
        <div className="min-w-0 pb-28 lg:pb-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {labels.pageTitle}
            </h1>
            <p className="text-gray-500 text-sm">{labels.pageSubtitle}</p>
          </div>

          {activeBoost && (
            <Alert
              type="info"
              showIcon
              icon={<RocketOutlined />}
              title={`Сейчас активен буст «${BOOST_LABELS[activeBoost.boostType]}», осталось ${formatDaysLeft(activeBoost.expiresAt)}`}
              description={
                BOOST_PRIORITY[activeBoost.boostType] >= BOOST_PRIORITY.premium
                  ? "Можно продлить активный тариф — дни добавятся к текущему сроку."
                  : "Можно продлить активный тариф или апгрейднуть до более высокого. При апгрейде остаток нынешнего тарифа уйдёт в скидку. Тарифы ниже недоступны."
              }
              className="mb-6"
            />
          )}

          <div className="space-y-3">
            {config.boostOptions.map((boost) => {
              const isBlocked =
                !!activeBoost &&
                BOOST_PRIORITY[boost.id] <
                  BOOST_PRIORITY[activeBoost.boostType];
              const isCurrentTier =
                !!activeBoost && activeBoost.boostType === boost.id;
              const isSelected = selectedBoost === boost.id;
              const savings = savingsByTier[boost.id];

              return (
                <button
                  key={boost.id}
                  onClick={() => !isBlocked && handleBoostSelect(boost.id)}
                  disabled={isBlocked}
                  className={`group relative w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    isBlocked
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                      : isSelected
                        ? boost.highlight
                          ? "border-purple-400 bg-purple-50/70 shadow-sm"
                          : "border-blue-400 bg-blue-50/50 shadow-sm"
                        : boost.highlight
                          ? "border-purple-200 bg-gradient-to-br from-purple-50/40 to-white hover:border-purple-300"
                          : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900 text-lg">
                          {boost.name}
                        </span>
                        {isCurrentTier && !isBlocked && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <RocketOutlined style={{ fontSize: 10 }} />
                            Активен · продлить
                          </span>
                        )}
                        {boost.highlight && !isBlocked && !isCurrentTier && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-500 text-white px-2 py-0.5 rounded-full">
                            <FireOutlined style={{ fontSize: 10 }} />
                            Рекомендуем
                          </span>
                        )}
                        {isBlocked && (
                          <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">
                            Недоступно
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
                      {savings && !isBlocked && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                          <TagOutlined style={{ fontSize: 11 }} />
                          Экономия {formatPrice(savings)} vs. покупки по
                          отдельности
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-gray-900 leading-none">
                        {formatPrice(boost.price)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {boost.days} дней
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {perDayPrice(boost.price, boost.days)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right column: checkout sidebar ── */}
        <aside className="mt-6 lg:mt-0 lg:sticky lg:top-[88px] lg:self-start flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Сводка</h3>

            <div className="divide-y divide-gray-100">
              <div className="flex justify-between py-2.5">
                <div className="min-w-0">
                  <span className="text-sm text-gray-900">
                    {currentBoost.name}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {currentBoost.days} дней ·{" "}
                    {perDayPrice(currentBoost.price, currentBoost.days)}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900 shrink-0">
                  {formatPrice(currentBoost.price)}
                </span>
              </div>

              {/* Pro-rated: остаток от младшего тира при апгрейде */}
              {isUpgrade && proRatedDiscount > 0 && activeBoost && (
                <div className="flex justify-between items-center py-2.5">
                  <div className="flex items-center gap-1.5 text-sm text-emerald-700 min-w-0">
                    <RocketOutlined className="shrink-0" />
                    <span className="truncate">
                      Остаток от «{BOOST_LABELS[activeBoost.boostType]}»
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-700 shrink-0">
                    −{formatPrice(proRatedDiscount)}
                  </span>
                </div>
              )}

              {/* Промокод */}
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

            {/* Итого */}
            <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-900">
                К оплате
              </span>
              <div className="text-right">
                {promoResult?.valid && (
                  <div className="text-sm text-gray-400 line-through">
                    {formatPrice(currentBoost.price)}
                  </div>
                )}
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(finalPrice)}
                </span>
              </div>
            </div>

            {/* Способ оплаты */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
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
                        color:
                          paymentMethod === "wallet" ? "#3b82f6" : "#9ca3af",
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
                    <WalletOutlined
                      style={{ fontSize: 22, color: "#3b82f6" }}
                    />
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
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <InfoCircleOutlined style={{ color: "#d97706", marginTop: 2 }} />
                <div className="text-xs text-amber-900">
                  <div className="font-medium">
                    Онлайн-оплата временно недоступна
                  </div>
                  <div className="mt-0.5 text-amber-800/80">
                    Оплатить буст можно с баланса кошелька, либо дождитесь
                    запуска платёжной системы.
                  </div>
                </div>
              </div>
            )}

            {/* Desktop CTA (inline) */}
            <Button
              type="primary"
              size="large"
              block
              icon={<CreditCardOutlined />}
              iconPlacement="end"
              onClick={handlePay}
              loading={loading}
              disabled={isSelectedBlocked}
              className="!mt-5 !hidden lg:!flex !h-[52px]"
              style={{
                fontSize: 15,
                fontWeight: 600,
                background: "#3B82F6",
                borderColor: "#3B82F6",
              }}
            >
              {primaryLabel}
            </Button>

            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 justify-center mt-3">
              <SafetyOutlined style={{ fontSize: 10, color: "#9ca3af" }} />
              Безопасная оплата
            </p>
          </div>

          <Alert
            type="info"
            showIcon
            icon={<SafetyOutlined />}
            title="Активация мгновенная"
            description={labels.safetyDescription}
            className="mt-4"
          />
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <StickyBottomBar
        primaryLabel={primaryLabel}
        onPrimary={handlePay}
        primaryIcon={<CreditCardOutlined />}
        primaryLoading={loading}
        primaryDisabled={isSelectedBlocked}
        onBack={() => router.push(config.returnUrl)}
        className="lg:hidden"
      />
    </PublicLayout>
  );
}
