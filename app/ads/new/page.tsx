"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Breadcrumb, Button, Form } from "antd";
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { PUBLICATION_PRICE, STORAGE_KEYS } from "@/lib/constants";
import { api, ApiError } from "@/lib/api-client";
import type { BudgetType } from "@/lib/types/ad";
import type { PaymentMethod } from "@/lib/types/payment";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

import {
  type FormValues,
  type Step0Values,
  type CategoryOption,
  type PromoResult,
  type PaymentMode,
  EMPTY_FORM,
  formatBudgetPreview,
} from "./_types";

import StepHeader from "./_components/StepHeader";
import StepSidebar from "./_components/StepSidebar";
import Step0Form from "./_components/Step0Form";
import Step1Form from "./_components/Step1Form";
import Step2Form from "./_components/Step2Form";
import Step3Preview from "./_components/Step3Preview";
import Step4Payment from "./_components/Step4Payment";

const STEP0_STORAGE_KEY = "business_contact_done";

function NewAdPageInner() {
  useRequireAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<FormValues>();
  const [form0] = Form.useForm<Step0Values>();

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [budgetType, setBudgetType] = useState<BudgetType | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("direct");
  const [adImages, setAdImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  const [videoFormats, setVideoFormats] = useState<CategoryOption[]>([]);
  const [adFormats, setAdFormats] = useState<CategoryOption[]>([]);
  const [adSubjects, setAdSubjects] = useState<CategoryOption[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kaspi");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);

  const [createdAdId, setCreatedAdId] = useState<string | null>(null);

  // Load category options
  useEffect(() => {
    Promise.all([
      api.get<{ data: CategoryOption[] }>("/api/video-formats"),
      api.get<{ data: CategoryOption[] }>("/api/ad-formats"),
      api.get<{ data: CategoryOption[] }>("/api/ad-subjects"),
    ])
      .then(([vf, af, as_]) => {
        setVideoFormats(vf.data ?? []);
        setAdFormats(af.data ?? []);
        setAdSubjects(as_.data ?? []);
      })
      .catch(() => {});
  }, []);

  // Проверяем — нужен ли шаг 0
  useEffect(() => {
    try {
      const done = localStorage.getItem(STEP0_STORAGE_KEY);
      if (!done) setStep(0);
    } catch {
      // ignore
    }
  }, []);

  // Восстановление черновика
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AD_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved) as FormValues;
        setValues(parsed);
        setBudgetType(parsed.budgetType ?? null);
        form.setFieldsValue(parsed);
      }
    } catch {
      // ignore
    }
  }, [form]);

  // Восстановление состояния оплаты при ?resume=true
  useEffect(() => {
    if (searchParams.get("resume") === "true") {
      try {
        const payState = localStorage.getItem(STORAGE_KEYS.PAYMENT_STATE);
        if (payState) {
          const { adId, selectedMethod } = JSON.parse(payState) as {
            adId?: string;
            selectedMethod: PaymentMethod;
          };
          if (adId) setCreatedAdId(adId);
          setPaymentMethod(selectedMethod);
          setStep(4);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  // Баланс кошелька при шаге 4 + smart default для способа оплаты
  useEffect(() => {
    if (step === 4) {
      api
        .get<{ balance: { current: number } }>("/api/balance")
        .then((r) => {
          const bal = r.balance.current;
          setWalletBalance(bal);
          // Smart default: auto-select wallet if sufficient balance
          const needed = isEscrowMode
            ? (form.getFieldValue("totalBudget") ?? 0)
            : finalPayPrice;
          if (bal >= needed) {
            setPaymentMethod("wallet");
          }
        })
        .catch(() => setWalletBalance(0));
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = (changed: Partial<FormValues>) => {
    const current = { ...values, ...changed };
    setValues(current);
    try {
      localStorage.setItem(STORAGE_KEYS.AD_DRAFT, JSON.stringify(current));
    } catch {
      // ignore
    }
  };

  const handleStep0Next = async () => {
    try {
      const vals = await form0.validateFields(["displayName", "telegram"]);
      await api.put("/api/users/me/advertiser-profile", {
        displayName: vals.displayName,
        telegram: vals.telegram ? `@${vals.telegram}` : null,
      });
      try {
        localStorage.setItem(STEP0_STORAGE_KEY, "done");
      } catch {
        // ignore
      }
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // validation errors shown by form
    }
  };

  const handleStep1Next = async () => {
    try {
      await form.validateFields([
        "title",
        "platform",
        "city",
        "category",
        "description",
      ]);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // validation errors shown by form
    }
  };

  const handleStep2Next = async () => {
    try {
      const fieldsToValidate: string[] = ["budgetType", "telegram"];
      if (budgetType === "fixed") fieldsToValidate.push("budgetFrom");
      if (budgetType === "per_views" || budgetType === "revenue")
        fieldsToValidate.push("budgetDetails");
      await form.validateFields(fieldsToValidate);
      const all = form.getFieldsValue(true) as FormValues;
      setValues({ ...all, budgetType });
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // validation errors shown by form
    }
  };

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

  const handleToPayment = async () => {
    setLoading(true);
    try {
      const all = form.getFieldsValue(true) as FormValues;
      const isEscrow = budgetType === "per_views" && paymentMode === "escrow";
      const ad = await api.post<{ id: string }>("/api/tasks", {
        title: all.title,
        platform: all.platform,
        city: all.city,
        category: all.category,
        description: all.description,
        budgetType: budgetType,
        budgetFrom: all.budgetFrom ?? null,
        budgetTo: all.budgetTo ?? null,
        budgetDetails: isEscrow ? null : (all.budgetDetails ?? null),
        contacts: isEscrow
          ? { telegram: null, whatsapp: null, phone: null, email: null }
          : {
              telegram: all.telegram ? `@${all.telegram}` : null,
              whatsapp: all.whatsapp ?? null,
              phone: null,
              email: null,
            },
        images: adImages,
        videoFormatId: all.videoFormatId ?? null,
        adFormatId: all.adFormatId ?? null,
        adSubjectId: all.adSubjectId ?? null,
        paymentMode: isEscrow ? "escrow" : "direct",
        rpm: isEscrow ? all.rpm : undefined,
        totalBudget: isEscrow ? all.totalBudget : undefined,
        minViews: isEscrow ? all.minViews || 10000 : undefined,
        maxViewsPerCreator: isEscrow
          ? all.maxViewsPerCreator || undefined
          : undefined,
        submissionDeadline: isEscrow ? all.submissionDeadline : undefined,
      });
      setCreatedAdId(ad.id);
      try {
        localStorage.setItem(
          STORAGE_KEYS.PAYMENT_STATE,
          JSON.stringify({
            adId: ad.id,
            selectedMethod: paymentMethod,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // ignore
      }
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(
          err.status === 401 ? "Необходима авторизация" : err.message,
        );
      } else {
        toast.error("Ошибка создания объявления");
      }
    } finally {
      setLoading(false);
    }
  };

  const isEscrowMode = budgetType === "per_views" && paymentMode === "escrow";

  const handlePay = async () => {
    if (!createdAdId) {
      toast.error("ID объявления не найден");
      return;
    }
    setLoading(true);
    try {
      const paymentUrl = isEscrowMode
        ? `/api/payments/ads/${createdAdId}/escrow`
        : `/api/payments/ads/${createdAdId}/publish`;

      const result = await api.post<{
        paymentId?: string;
        sessionId?: string;
        paymentUrl?: string;
        status?: string;
        isFree?: boolean;
      }>(paymentUrl, {
        method: paymentMethod,
        promoCode:
          !isEscrowMode && promoResult?.valid
            ? promoCodeInput.trim()
            : undefined,
      });

      try {
        localStorage.removeItem(STORAGE_KEYS.AD_DRAFT);
        localStorage.removeItem(STORAGE_KEYS.PAYMENT_STATE);
      } catch {
        // ignore
      }

      if (
        result.isFree ||
        result.status === "success" ||
        (result as { fromWallet?: boolean }).fromWallet
      ) {
        const msg = isEscrowMode
          ? "Бюджет заморожен! Задание опубликовано."
          : "Оплата прошла! Объявление опубликовано на 7 дней.";
        toast.success(msg, {
          description: isEscrowMode
            ? "Креаторы теперь могут взять задание и подать видео."
            : "Продвинуть объявление можно позже из личного кабинета.",
        });
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
        toast.error("Ошибка оплаты");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (step === 0) handleStep0Next();
    else if (step === 1) handleStep1Next();
    else if (step === 2) handleStep2Next();
    else if (step === 3) handleToPayment();
    else handlePay();
  };

  const stepLabels = ["Основное", "Детали", "Предпросмотр", "Оплата"];

  const budgetPreview = formatBudgetPreview(
    budgetType,
    values.budgetFrom,
    values.budgetTo,
    values.budgetDetails,
  );

  const finalPayPrice =
    promoResult?.valid && promoResult.finalAmount !== undefined
      ? promoResult.finalAmount
      : PUBLICATION_PRICE;

  const paymentMethodLabels: Record<PaymentMethod, string> = {
    wallet: "Списать из кошелька",
    kaspi: "Оплатить через Kaspi Pay",
    halyk: "Оплатить через Halyk",
    card: "Оплатить картой",
  };

  const step4Price = isEscrowMode
    ? formatPrice(form.getFieldValue("totalBudget") ?? 0)
    : formatPrice(finalPayPrice);

  const nextLabel =
    step === 0
      ? "Продолжить →"
      : step === 1
        ? "Далее: Детали"
        : step === 2
          ? "Предпросмотр"
          : step === 3
            ? "К оплате"
            : isEscrowMode && paymentMethod === "wallet"
              ? `Заморозить ${step4Price}`
              : `${paymentMethodLabels[paymentMethod]} ${step4Price}`;

  const stepTitle =
    step === 0
      ? "Быстрая настройка"
      : step === 1
        ? "Основная информация"
        : step === 2
          ? "Детали и контакты"
          : step === 3
            ? "Предпросмотр"
            : "Оплата публикации";

  return (
    <PublicLayout>
      <Breadcrumb
        className="mb-6 hidden sm:block"
        items={[
          { title: <Link href="/">Главная</Link> },
          { title: <Link href="/ads/manage">Мои объявления</Link> },
          { title: "Новое объявление" },
        ]}
      />

      <StepHeader step={step} stepTitle={stepTitle} stepLabels={stepLabels} />

      <div className="max-w-5xl mx-auto">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
          {/* Left column */}
          <div className="pb-28 lg:pb-8">
            {step === 0 && <Step0Form form={form0} />}

            <Form
              form={form}
              name="create_ad"
              layout="vertical"
              size="large"
              className="space-y-4"
              onValuesChange={(changed) =>
                saveDraft(changed as Partial<FormValues>)
              }
            >
              {step === 1 && (
                <Step1Form
                  form={form}
                  values={values}
                  adImages={adImages}
                  imageUploading={imageUploading}
                  videoFormats={videoFormats}
                  adFormats={adFormats}
                  adSubjects={adSubjects}
                  saveDraft={saveDraft}
                  setValues={setValues}
                  setAdImages={setAdImages}
                  setImageUploading={setImageUploading}
                />
              )}

              {step === 2 && (
                <Step2Form
                  form={form}
                  budgetType={budgetType}
                  paymentMode={paymentMode}
                  setBudgetType={setBudgetType}
                  setPaymentMode={setPaymentMode}
                  saveDraft={saveDraft}
                />
              )}

              {step === 3 && (
                <Step3Preview
                  form={form}
                  budgetType={budgetType}
                  budgetPreview={budgetPreview}
                  isEscrowMode={isEscrowMode}
                  videoFormats={videoFormats}
                  adFormats={adFormats}
                  adSubjects={adSubjects}
                />
              )}
            </Form>

            {step === 4 && (
              <Step4Payment
                form={form}
                isEscrowMode={isEscrowMode}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                walletBalance={walletBalance}
                promoCodeInput={promoCodeInput}
                setPromoCodeInput={setPromoCodeInput}
                promoResult={promoResult}
                setPromoResult={setPromoResult}
                promoLoading={promoLoading}
                handleApplyPromo={handleApplyPromo}
                finalPayPrice={finalPayPrice}
              />
            )}

            {/* Desktop inline navigation */}
            <div className="hidden lg:flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              {step >= 1 && (
                <Button
                  size="large"
                  icon={step === 1 ? <CloseOutlined /> : <ArrowLeftOutlined />}
                  onClick={
                    step === 1 ? () => router.push("/ads/manage") : handleBack
                  }
                  style={{ height: 48, width: 48, flexShrink: 0, padding: 0 }}
                  aria-label={step === 1 ? "Отменить" : "Назад"}
                />
              )}
              <Button
                type="primary"
                size="large"
                block
                icon={
                  step === 4 ? <CreditCardOutlined /> : <ArrowRightOutlined />
                }
                iconPlacement="end"
                onClick={handleNext}
                loading={(step === 3 || step === 4) && loading}
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  background: "#3B82F6",
                  borderColor: "#3B82F6",
                  flex: 1,
                }}
              >
                {nextLabel}
              </Button>
            </div>
          </div>

          {/* Right column — desktop sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-[88px] self-start">
            <StepSidebar
              step={step}
              budgetType={budgetType}
              values={values}
              form={form}
              isEscrowMode={isEscrowMode}
              finalPayPrice={finalPayPrice}
              walletBalance={walletBalance}
            />
          </aside>
        </div>
      </div>

      {/* Sticky Bottom Navigation Bar (mobile) */}
      <StickyBottomBar
        primaryLabel={nextLabel}
        onPrimary={handleNext}
        primaryIcon={
          step === 4 ? <CreditCardOutlined /> : <ArrowRightOutlined />
        }
        primaryLoading={(step === 3 || step === 4) && loading}
        onBack={step >= 1 ? handleBack : undefined}
        isFirstStep={step === 1}
        cancelHref={step === 1 ? "/ads/manage" : undefined}
        className="lg:hidden"
      />
    </PublicLayout>
  );
}

export default function NewAdPage() {
  return (
    <Suspense fallback={null}>
      <NewAdPageInner />
    </Suspense>
  );
}
