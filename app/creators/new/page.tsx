"use client";

import { useState, useEffect } from "react";
import { Form, Button } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/constants";
import {
  useCities,
  usePlatforms,
  useCategories,
  useAdFormats,
} from "@/hooks/useRefData";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { api, ApiError } from "@/lib/api-client";
import {
  PLATFORM_URL_CONFIG,
  buildCreatorPlatforms,
  buildCreatorPortfolio,
  buildCreatorPricing,
} from "@/lib/creator-form-config";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useFetchFollowers } from "@/hooks/useFetchFollowers";
import StepHeader from "./_components/StepHeader";
import Step1Basics from "./_components/Step1Basics";
import Step2Platforms from "./_components/Step2Platforms";
import Step3Contacts from "./_components/Step3Contacts";
import Step4Portfolio, {
  type PortfolioDraftBase,
} from "./_components/Step4Portfolio";

type PortfolioDraftItem = PortfolioDraftBase;

type StepNum = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Основа", "Платформы", "Контакты и цены", "Портфолио"];
const STEP_TITLES: Record<StepNum, string> = {
  1: "Расскажите о себе",
  2: "Где вы публикуете контент",
  3: "Как с вами связаться",
  4: "Покажите свои работы",
};

const DRAFT_EXTRAS_KEY = `${STORAGE_KEYS.CREATOR_DRAFT}:extras`;

type DraftExtras = {
  avatar: string | null;
  portfolio: PortfolioDraftItem[];
};

function loadExtras(): DraftExtras {
  try {
    const raw = localStorage.getItem(DRAFT_EXTRAS_KEY);
    if (!raw) return { avatar: null, portfolio: [] };
    const parsed = JSON.parse(raw) as Partial<DraftExtras>;
    return {
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : null,
      portfolio: Array.isArray(parsed.portfolio) ? parsed.portfolio : [],
    };
  } catch {
    return { avatar: null, portfolio: [] };
  }
}

function saveExtras(extras: DraftExtras) {
  try {
    localStorage.setItem(DRAFT_EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    /* ignore quota errors */
  }
}

export default function CreatorNewPage() {
  useRequireAuth();
  const { user } = useAuth();

  const router = useRouter();
  const [step, setStep] = useState<StepNum>(1);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { data: adFormats = [] } = useAdFormats();
  const {
    url: avatarUrl,
    setUrl: setAvatarUrl,
    uploading: avatarUploading,
    upload: handleAvatarUpload,
  } = useAvatarUpload();
  const { fetchingPlatform, fetchFollowers: handleFetchFollowers } =
    useFetchFollowers(form);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioDraftItem[]>(
    [],
  );
  const { data: cities = [] } = useCities();
  const { data: platforms = [] } = usePlatforms();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CREATOR_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        form.setFieldsValue(parsed);
      }
    } catch {
      /* ignore corrupted data */
    }
    const extras = loadExtras();
    setAvatarUrl(extras.avatar);
    setPortfolioItems(extras.portfolio);
  }, [form, setAvatarUrl]);

  // Префил Telegram из привязанного аккаунта, если поле пустое
  useEffect(() => {
    const tg = user?.telegramUsername;
    if (!tg) return;
    if (!form.getFieldValue("telegram")) {
      form.setFieldValue("telegram", tg);
    }
  }, [user?.telegramUsername, form]);

  useEffect(() => {
    saveExtras({ avatar: avatarUrl, portfolio: portfolioItems });
  }, [avatarUrl, portfolioItems]);

  const saveDraft = () => {
    try {
      const allValues = form.getFieldsValue(true);
      localStorage.setItem(
        STORAGE_KEYS.CREATOR_DRAFT,
        JSON.stringify(allValues),
      );
    } catch {
      /* ignore quota errors */
    }
  };

  const stepFieldMap: Record<StepNum, string[]> = {
    1: ["fullName", "title", "city", "categories"],
    2: [],
    3: ["telegram", "email"],
    4: [],
  };

  const validateStep2Platforms = (): boolean => {
    const handles =
      (form.getFieldValue("platformHandles") as
        | Record<string, string | undefined>
        | undefined) ?? {};
    const hasAny = Object.values(handles).some((v) => (v ?? "").trim().length > 0);
    if (!hasAny) {
      toast.error("Укажите хотя бы одну платформу");
      return false;
    }
    return true;
  };

  const cleanupStep3Prices = () => {
    const items =
      (form.getFieldValue("priceItems") as
        | {
            platform?: string;
            adFormatLabel?: string;
            price?: number;
            priceUnit?: string;
          }[]
        | undefined) ?? [];
    const cleaned = items.filter(
      (it) => it?.adFormatLabel?.trim() || (it?.price ?? 0) > 0,
    );
    if (cleaned.length !== items.length) {
      form.setFieldValue("priceItems", cleaned);
    }
  };

  const cleanupStep4Portfolio = () => {
    setPortfolioItems((prev) => prev.filter((p) => p.videoUrl.trim().length > 0));
  };

  const handleNext = async () => {
    try {
      const fields = stepFieldMap[step];
      if (fields.length > 0) {
        await form.validateFields(fields);
      }
      if (step === 2 && !validateStep2Platforms()) return;
      if (step === 3) cleanupStep3Prices();
      if (step === 4) cleanupStep4Portfolio();
      if (step < 4) {
        setStep((s) => (s + 1) as StepNum);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      /* validation errors shown inline */
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as StepNum);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/cabinet");
    }
  };

  const handleSubmit = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      const pricing = buildCreatorPricing(
        values.priceItems as Parameters<typeof buildCreatorPricing>[0],
      );
      const platformsPayload = buildCreatorPlatforms(
        values.platformHandles as Record<string, string | undefined> | undefined,
        values.platformFollowers as
          | Record<string, number | null | undefined>
          | undefined,
      );
      const portfolioPayload = buildCreatorPortfolio(portfolioItems);
      const profile = await api.post<{ id: string; isPublished: boolean }>(
        "/api/creators",
        {
          title: values.title,
          fullName: values.fullName,
          username: values.username || null,
          bio: values.bio || null,
          city: values.city,
          availability: values.availability ?? "available",
          contentCategories: values.categories,
          platforms: platformsPayload,
          avatar: avatarUrl,
          portfolio: portfolioPayload,
          contacts: {
            telegram: values.telegram ? `@${values.telegram}` : null,
            whatsapp: values.whatsapp ?? null,
            phone: values.phone ?? null,
            email: values.email ?? null,
          },
          pricing: {
            minimumRate: pricing.minimumRate,
            negotiable: values.negotiable ?? true,
            items: pricing.items,
          },
        },
      );
      localStorage.removeItem(STORAGE_KEYS.CREATOR_DRAFT);
      localStorage.removeItem(DRAFT_EXTRAS_KEY);
      if (profile.isPublished) {
        router.push(`/creators/${profile.id}/published`);
      } else {
        toast.success(
          "Профиль создан как черновик. Добавьте фото и работу в портфолио, чтобы опубликовать.",
        );
        router.push(`/creators/manage`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(
          err.status === 401 ? "Необходима авторизация" : err.message,
        );
      } else {
        toast.error("Ошибка создания профиля");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = step === 4;
  const primaryLabel = isLastStep ? "Создать профиль" : "Далее";
  const primaryAction = isLastStep ? handleSubmit : handleNext;

  return (
    <PublicLayout>
      <div className="-mt-8 sm:mt-0" />
      <StepHeader
        step={step}
        stepTitle={STEP_TITLES[step]}
        stepLabels={STEP_LABELS}
      />

      <div>
        <div className="pb-28 lg:pb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <Form
              form={form}
              name="creator_new"
              layout="vertical"
              size="large"
              onValuesChange={saveDraft}
            >
              <div className={step === 1 ? "" : "hidden"}>
                <Step1Basics
                  form={form}
                  cities={cities}
                  categories={categories}
                  avatar={{
                    url: avatarUrl,
                    uploading: avatarUploading,
                    onUpload: handleAvatarUpload,
                  }}
                />
              </div>
              <div className={step === 2 ? "" : "hidden"}>
                <Step2Platforms
                  form={form}
                  platforms={platforms}
                  fetchingPlatform={fetchingPlatform}
                  onFetchFollowers={handleFetchFollowers}
                  platformUrlConfig={PLATFORM_URL_CONFIG}
                />
              </div>
              <div className={step === 3 ? "" : "hidden"}>
                <Step3Contacts
                  form={form}
                  platforms={platforms}
                  adFormats={adFormats}
                />
              </div>
              <div className={step === 4 ? "" : "hidden"}>
                <Step4Portfolio
                  items={portfolioItems}
                  onChange={setPortfolioItems}
                  categories={categories}
                />
              </div>
            </Form>
          </div>

          <div className="hidden lg:flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              {step === 1 ? "Отменить" : "← Назад"}
            </button>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
              onClick={primaryAction}
              loading={loading}
              style={{
                height: 44,
                fontSize: 15,
                fontWeight: 600,
                paddingLeft: 32,
                paddingRight: 32,
                background: "#3B82F6",
                borderColor: "#3B82F6",
              }}
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>

      <StickyBottomBar
        primaryLabel={primaryLabel}
        onPrimary={primaryAction}
        primaryIcon={<ArrowRightOutlined />}
        primaryLoading={loading}
        onBack={handleBack}
        isFirstStep={step === 1}
        cancelHref="/cabinet"
        className="lg:hidden"
      />
    </PublicLayout>
  );
}
